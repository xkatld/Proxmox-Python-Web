# routers/containers.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from services import pve_manager
from models import pve as pve_models
from dependencies.auth import get_api_key

router = APIRouter(
    prefix="/api/containers",
    tags=["Containers"],
    dependencies=[Depends(get_api_key)], # 所有端点都需要 API Key
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[pve_models.ContainerBase])
async def read_containers():
    """获取所有 LXC 容器列表。"""
    try:
        containers_raw = pve_manager.list_lxc_containers()
        containers_list = [
            pve_models.ContainerBase(
                vmid=c.get('vmid'),
                name=c.get('name'),
                status=c.get('status'),
                ip=c.get('ip')
            ) for c in containers_raw
        ]
        return containers_list
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取容器列表失败: {e}")

@router.post("/", response_model=pve_models.ApiResponse)
async def create_new_container(container: pve_models.ContainerCreate):
    """创建新的 LXC 容器。"""
    try:
        result = pve_manager.create_lxc_container(
            vmid=container.vmid,
            hostname=container.hostname,
            password=container.password,
            template=container.template,
            storage=container.storage,
            net_config=container.net_config,
            cpu_cores=container.cpu_cores,
            memory=container.memory,
            disk=container.disk
        )
        if result['status'] == 'error':
            raise HTTPException(status_code=400, detail=result['message'])
        return pve_models.ApiResponse(status="success", message=result['message'], details=result)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建容器失败: {e}")


@router.get("/{vmid}", response_model=pve_models.ContainerBase)
async def read_container_details(vmid: int):
    """获取指定 LXC 容器的详细信息。"""
    try:
        details = pve_manager.get_lxc_details(vmid)
        if not details:
            raise HTTPException(status_code=404, detail=f"未找到 VMID 为 {vmid} 的容器")
        return pve_models.ContainerBase(
            vmid=details.get('vmid'),
            name=details.get('name'),
            status=details.get('status'),
            ip=details.get('ip')
            # 可以添加更多字段
        )
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取容器详情失败: {e}")

@router.post("/{vmid}/action", response_model=pve_models.ApiResponse)
async def perform_container_action(vmid: int, action: pve_models.ContainerAction):
    """对容器执行操作 (start, stop, reboot, delete)。"""
    try:
        result = pve_manager.control_lxc_container(vmid, action.action)
        if result['status'] == 'error':
            raise HTTPException(status_code=400, detail=result['message'])
        return pve_models.ApiResponse(status="success", message=result['message'], details=result)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"执行操作失败: {e}")

@router.post("/{vmid}/exec", response_model=pve_models.ApiResponse)
async def execute_container_command(vmid: int, command: pve_models.CommandExec):
    """在容器内执行命令 (简化版)。"""
    try:
        result = pve_manager.exec_lxc_command(vmid, command.command)
        return pve_models.ApiResponse(
            status=result['status'],
            message=result['message'],
            details=result.get('result')
        )
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"执行命令失败: {e}")

# 可以添加获取模板和存储的端点
@router.get("/utils/templates", tags=["Utilities"])
async def list_templates(storage: str = Query("local", description="存储名称")):
    try:
        return pve_manager.list_pve_templates(storage)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.get("/utils/storage", tags=["Utilities"])
async def list_storage():
    try:
        return pve_manager.list_pve_storage()
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
