from pydantic import BaseModel
from typing import Optional, List

class ContainerBase(BaseModel):
    vmid: int
    name: Optional[str] = None
    status: Optional[str] = None
    ip: Optional[str] = None
    template: Optional[str] = None

class ContainerCreate(BaseModel):
    vmid: int
    hostname: str
    password: str
    template: str
    storage: str
    net_config: str
    cpu_cores: Optional[int] = 1
    memory: Optional[int] = 512
    disk: Optional[int] = 5

class ContainerAction(BaseModel):
    action: str

class CommandExec(BaseModel):
    command: str

class ApiResponse(BaseModel):
    status: str
    message: str
    data: Optional[List[ContainerBase]] = None
    details: Optional[dict] = None
