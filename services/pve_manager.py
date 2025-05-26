import logging
from proxmoxer import ProxmoxAPI
from config import (
    PVE_HOST, PVE_USER, PVE_PASSWORD, PVE_VERIFY_SSL,
    PVE_TOKEN_NAME, PVE_TOKEN_VALUE, PVE_NODE
)

logger = logging.getLogger(__name__)

def get_pve_api():
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
        proxmox.version.get()
        logger.info("Proxmox connection successful.")
        return proxmox
    except Exception as e:
        logger.error(f"Failed to connect to Proxmox: {e}")
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
                c['ip'] = ip_match if ip_match else 'N/A'
            except Exception:
                 c['ip'] = 'Error'
        return containers
    except Exception as e:
        logger.error(f"Failed to list LXC containers: {e}")
        return []

def get_lxc_details(vmid):
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
        logger.error(f"Failed to create LXC container {hostname}: {e}")
        return {"status": "error", "message": str(e)}

def control_lxc_container(vmid, action):
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
            try: lxc.status.stop.post()
            except: pass
            task_id = lxc.delete()
        else:
            return {"status": "error", "message": "无效的操作"}
        return {"status": "success", "message": f"操作 '{action}' 已提交", "task_id": task_id}
    except Exception as e:
        logger.error(f"Failed to {action} LXC container {vmid}: {e}")
        return {"status": "error", "message": str(e)}

def exec_lxc_command(vmid, command):
    try:
        node = get_node()
        result = node.lxc(vmid).termproxy.post(command=command)
        return {"status": "warning", "message": "命令执行需要 WebSocket，此为简化版。", "result": result}
    except Exception as e:
        logger.error(f"Failed to execute command in LXC {vmid}: {e}")
        return {"status": "error", "message": str(e)}

def list_pve_templates(storage='local'):
    try:
        pve = get_pve_api()
        templates = pve.storage(storage).content.get(content='vztmpl')
        return templates
    except Exception as e:
        logger.error(f"Failed to list PVE templates: {e}")
        return []

def list_pve_storage():
    try:
        pve = get_pve_api()
        storages = pve.storage.get()
        return [s for s in storages if s.get('type') in ['dir', 'lvm', 'zfspool']]
    except Exception as e:
        logger.error(f"Failed to list PVE storage: {e}")
        return []
