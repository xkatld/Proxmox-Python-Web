import logging
from proxmoxer import ProxmoxAPI
from config import (
    PVE_HOST, PVE_USER, PVE_PASSWORD, PVE_VERIFY_SSL, PVE_NODE
)

logger = logging.getLogger(__name__)

def get_pve_api():
    try:
        logger.info(f"正在使用密码连接到 Proxmox: {PVE_HOST}。")
        proxmox = ProxmoxAPI(
            PVE_HOST,
            user=PVE_USER,
            password=PVE_PASSWORD,
            verify_ssl=PVE_VERIFY_SSL
        )
        proxmox.version.get()
        logger.info("Proxmox 连接成功。")
        return proxmox
    except Exception as e:
        logger.error(f"连接 Proxmox 失败: {e}")
        raise ConnectionError(f"无法连接到 Proxmox: {e}")

def get_node():
    pve = get_pve_api()
    return pve.nodes(PVE_NODE)

def list_lxc_containers():
    try:
        node = get_node()
        containers = node.lxc.get()
        for c in containers:
            try:
                config = node.lxc(c['vmid']).config.get()
                net0 = config.get('net0', '')
                ip_match = next((part.split('=')[1].split('/')[0] for part in net0.split(',') if part.startswith('ip=')), None)
                c['ip'] = ip_match if ip_match else '无'
                ostemplate = config.get('ostemplate', 'N/A')
                c['template'] = ostemplate.split('/')[-1].replace('.conf', '') if ostemplate != 'N/A' else 'N/A'
            except Exception:
                 c['ip'] = '错误'
                 c['template'] = '错误'
        return containers
    except Exception as e:
        logger.error(f"列出 LXC 容器失败: {e}")
        return []

def get_lxc_details(vmid):
    try:
        node = get_node()
        status = node.lxc(vmid).status.current.get()
        config = node.lxc(vmid).config.get()
        net0 = config.get('net0', '')
        ip_match = next((part.split('=')[1].split('/')[0] for part in net0.split(',') if part.startswith('ip=')), None)
        status['ip'] = ip_match if ip_match else '无'
        status['config'] = config
        return status
    except Exception as e:
        logger.error(f"获取 LXC {vmid} 详情失败: {e}")
        return None

def create_lxc_container(vmid, hostname, password, template, storage, net_config, cpu_cores=1, memory=512, disk=5):
    try:
        node = get_node()
        params = {
            'vmid': vmid,
            'hostname': hostname,
            'password': password,
            'ostemplate': template,
            'storage': storage,
            'net0': net_config,
            'cores': cpu_cores,
            'memory': memory,
            'rootfs': f'{storage}:{disk}',
            'start': 1,
        }
        task_id = node.lxc.create(**params)
        return {"status": "success", "message": "创建任务已提交", "task_id": task_id}
    except Exception as e:
        logger.error(f"创建 LXC 容器 {hostname} 失败: {e}")
        return {"status": "error", "message": str(e)}

def control_lxc_container(vmid, action):
    try:
        node = get_node()
        lxc = node.lxc(vmid)
        task_id = None
        if action == 'start':
            task_id = lxc.status.start.post()
        elif action == 'stop':
            task_id = lxc.status.stop.post()
        elif action == 'shutdown':
            task_id = lxc.status.shutdown.post()
        elif action == 'reboot':
            task_id = lxc.status.reboot.post()
        elif action == 'delete':
            try:
                status = lxc.status.current.get()
                if status.get('status') == 'running':
                    lxc.status.stop.post()
                    # 等待 PVE 处理停止操作，实际应用中可能需要更复杂的等待逻辑
                    import time
                    time.sleep(5)
            except Exception:
                pass
            task_id = lxc.delete()
        else:
            return {"status": "error", "message": "无效的操作"}
        return {"status": "success", "message": f"操作 '{action}' 已提交", "task_id": task_id}
    except Exception as e:
        logger.error(f"执行 {action} LXC 容器 {vmid} 失败: {e}")
        return {"status": "error", "message": str(e)}

def exec_lxc_command(vmid, command):
    try:
        node = get_node()
        result = node.lxc(vmid).vncproxy.post(cmd=command)
        return {"status": "warning", "message": "命令执行可能不返回直接输出。", "result": result}
    except Exception as e:
        logger.error(f"在 LXC {vmid} 中执行命令失败: {e}")
        return {"status": "error", "message": str(e)}

def list_pve_templates(storage='local'):
    try:
        node = get_node()
        templates = node.storage(storage).content.get(content='vztmpl')
        return templates
    except Exception as e:
        logger.error(f"列出 PVE 模板失败: {e}")
        return []

def list_pve_storage():
    try:
        node = get_node()
        storages = node.storage.get()
        return [s for s in storages if s.get('content') and ('vztmpl' in s.get('content') or 'rootdir' in s.get('content') or 'images' in s.get('content'))]
    except Exception as e:
        logger.error(f"列出 PVE 存储失败: {e}")
        return []
