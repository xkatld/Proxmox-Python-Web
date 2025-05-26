# main.py
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from routers import containers
import uvicorn
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Proxmox LXC Web API",
    description="一个通过 FastAPI 管理 Proxmox LXC 容器的 Web 界面和 API。",
    version="1.0.0",
)

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")

# 设置 Jinja2 模板目录
templates = Jinja2Templates(directory="templates")

# 包含 API 路由
app.include_router(containers.router)

# Web UI 路由
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """显示主 Web UI 页面。"""
    # 这里可以预加载一些数据，或者让前端通过 API 加载
    # 注意：Web UI 认证需要额外实现 (例如 Cookie/Session)
    # 为了简单起见，这里假设前端将使用 API Key 调用 /api/
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    """健康检查端点。"""
    return {"status": "ok"}

if __name__ == "__main__":
    logger.info("Starting Proxmox LXC Web API server...")
    # 运行 FastAPI 应用
    # 生产环境建议使用 Gunicorn + Uvicorn workers
    uvicorn.run(app, host="0.0.0.0", port=8000)
