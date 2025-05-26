# config.py
import os

# Proxmox VE Connection Details
PVE_HOST = os.environ.get('PVE_HOST', 'your_pve_ip_or_hostname')
PVE_USER = os.environ.get('PVE_USER', 'root@pam') # 或者 'your_api_user@pve'
PVE_PASSWORD = os.environ.get('PVE_PASSWORD', 'your_pve_password')
PVE_TOKEN_NAME = os.environ.get('PVE_TOKEN_NAME', None) # 或者 'your_token_name'
PVE_TOKEN_VALUE = os.environ.get('PVE_TOKEN_VALUE', None) # 或者 'your_token_value'
PVE_VERIFY_SSL = os.environ.get('PVE_VERIFY_SSL', 'false').lower() == 'true'
PVE_NODE = os.environ.get('PVE_NODE', 'your_pve_node_name') # 需要操作的节点名

# FastAPI App Configuration
APP_SECRET_KEY = os.environ.get('APP_SECRET_KEY', 'a_very_secret_key_for_fastapi')
API_KEY = os.environ.get('API_KEY', 'your_super_secret_api_key') # 用于访问 FastAPI 的密钥
API_KEY_NAME = "X-API-Key"
