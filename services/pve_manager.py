# services/pve_manager.py
import logging
from proxmoxer import ProxmoxAPI
from config import (
    PVE_HOST, PVE_USER, PVE_PASSWORD, PVE_VERIFY_SSL,
    PVE_TOKEN_NAME, PVE_TOKEN_VALUE, PVE_NODE
)

logger = logging.getLogger(__name__)

def get_pve_api():
    """建立并返回 ProxmoxAPI 连接实例。"""
    try:
        if PVE_TOKEN_NAME and PVE_TOKEN_VALUE:
            logger.info(f"Connecting to Proxmox at {PVE_HOST} using API Token.")
            proxmox = ProxmoxAPI(
                PVE_HOST,
                user=f"{PVE_USER}!{PVE_TOKEN_NAME}",
                token=PVE_TOKEN_VALUE,
                verify_ssl=PVE_VERIFY_SSL
            )
        else:
            logger.info(f"Connecting to Proxmox at {PVE_HOST} using Password.")
            proxmox = ProxmoxAPI(
                PVE_HOST,
                user=PVE_USER,
                password=PVE_PASSWORD,
                verify_ssl=PVE_VERIFY_SSL
            )
        # 检查连接
        proxmox.version.get()
        logger.info("Proxmox connection successful.")
        return proxmox
    except Exception as e:
        logger.error(f"Failed to connect to Proxmox: {e}")
        raise ConnectionError(f"无法连接到 Proxmox: {e}")

def get_node():
    """获取 Proxmox 节点对象。"""
    pve = get_pve_api()
    return pve.nodes(PVE_NODE)

def list_lxc_containers():
    """列出指定节点上的所有 LXC 容器。"""
    try:
        node = get_node()
        containers = node.lxc.get()
        # 获取每个容器的 IP 地址 (可能需要一些时间)
        for c in containers:
            try:
                config = node.lxc(c['vmid']).config.get()
                net0 = config.get('net0', '')
                ip_match = next((part.split('=')[1].split('/')[0] for part in net0.split(',') if part.startswith('ip=')), None)
                c['ip'] = ip_match if ip_match else 'N/A'
            except Exception:
                 c['ip'] = 'Error' # 获取 IP 失败
        return containers
    except Exception as e:
        logger.error(f"Failed to list LXC containers: {e}")
        return []

def get_lxc_details(vmid):
    """获取指定 LXC 容器的详细信息。"""
    try:
        node = get_node()
        status = node.lxc(vmid).status.current.get()
        config = node.lxc(vmid).config.get()
        net0 = config.get('net0', '')
        ip_match = next((part.split('=')[1].split('/')[0] for part in net0.split(',') if part.startswith('ip=')), None)
        status['ip'] = ip_match if ip_match else 'N/A'
        status['config'] = config
        return status
    except Exception as e:
        logger.error(f"Failed to get LXC details for {vmid}: {e}")
        return None

def create_lxc_container(vmid, hostname, password, template, storage, net_config, cpu_cores=1, memory=512, disk=5):
    """创建新的 LXC 容器。"""
    try:
        node = get_node()
        params = {
            'vmid': vmid,
            'hostname': hostname,
            'password': password,
            'ostemplate': template, # 格式: storage:vztmpl/template-file.tar.gz
            'storage': storage,
            'net0': net_config, # 格式: name=eth0,bridge=vmbr0,ip=dhcp
            'cores': cpu_cores,
            'memory': memory,
            'rootfs': f'{storage}:{disk}',
            'start': 1, # 创建后启动
        }
        task_id = node.lxc.create(**params)
        # TODO: 可以添加等待任务完成的逻辑
        return {"status": "success", "message": "创建任务已提交", "task_id": task_id}
    except Exception as e:
        logger.error(f"Failed to create LXC container {hostname}: {e}")
        return {"status": "error", "message": str(e)}

def control_lxc_container(vmid, action):
    """控制 LXC 容器 (start, stop, shutdown, reboot, delete)。"""
    try:
        node = get_node()
        lxc = node.lxc(vmid)
        if action == 'start':
            task_id = lxc.status.start.post()
        elif action == 'stop':
            task_id = lxc.status.stop.post()
        elif action == 'shutdown':
            task_id = lxc.status.shutdown.post()
        elif action == 'reboot':
            task_id = lxc.status.reboot.post()
        elif action == 'delete':
            # 确保容器已停止
            try: lxc.status.stop.post()
            except: pass # 忽略错误，可能已经停止
            # TODO: 添加等待停止的逻辑
            task_id = lxc.delete()
        else:
            return {"status": "error", "message": "无效的操作"}
        return {"status": "success", "message": f"操作 '{action}' 已提交", "task_id": task_id}
    except Exception as e:
        logger.error(f"Failed to {action} LXC container {vmid}: {e}")
        return {"status": "error", "message": str(e)}

def exec_lxc_command(vmid, command):
    """在 LXC 容器内执行命令。"""
    try:
        node = get_node()
        # PVE API 的 exec 比较复杂，它返回一个 PID 和一个 WebSocket 路径
        # 通常需要 WebSocket 来获取输出。
        # 这里我们尝试一个简单的、可能阻塞的方式 (如果命令很快)
        # 或者返回一个提示，说明需要 WebSocket (更复杂)
        # 注意: proxmoxer 本身不直接支持 exec 的 WebSocket 部分。
        # 你可能需要手动实现 WebSocket 连接或使用 qm/pct exec。
        # 这是一个简化的示例，可能无法获取长时间运行命令的输出。
        result = node.lxc(vmid).termproxy.post(command=command)
        # 实际应用中，你需要用 result['ticket'] 和 result['port'] 去连接 WebSocket
        return {"status": "warning", "message": "命令执行需要 WebSocket，此为简化版。", "result": result}
    except Exception as e:
        logger.error(f"Failed to execute command in LXC {vmid}: {e}")
        return {"status": "error", "message": str(e)}

def list_pve_templates(storage='local'):
    """列出 PVE 上的 LXC 模板。"""
    try:
        pve = get_pve_api()
        templates = pve.storage(storage).content.get(content='vztmpl')
        return templates
    except Exception as e:
        logger.error(f"Failed to list PVE templates: {e}")
        return []

def list_pve_storage():
    """列出 PVE 上的存储。"""
    try:
        pve = get_pve_api()
        storages = pve.storage.get()
        return [s for s in storages if s.get('type') in ['dir', 'lvm', 'zfspool']] # 筛选常用存储类型
    except Exception as e:
        logger.error(f"Failed to list PVE storage: {e}")
        return []
