# dependencies/auth.py
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
from config import API_KEY, API_KEY_NAME

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    """检查并验证 API 密钥。"""
    if not api_key_header:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="请求头中缺少 API 密钥 (X-API-Key)。"
        )
    if api_key_header == API_KEY:
        return api_key_header
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="提供的 API 密钥无效。"
        )

# TODO: 还可以添加基于 PVE Token 或 Session 的 Web UI 认证
