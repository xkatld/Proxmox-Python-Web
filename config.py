import os

PVE_HOST = os.environ.get('PVE_HOST', 'your_pve_ip_or_hostname')
PVE_USER = os.environ.get('PVE_USER', 'root@pam')
PVE_PASSWORD = os.environ.get('PVE_PASSWORD', 'your_pve_password')
PVE_TOKEN_NAME = os.environ.get('PVE_TOKEN_NAME', None)
PVE_TOKEN_VALUE = os.environ.get('PVE_TOKEN_VALUE', None)
PVE_VERIFY_SSL = os.environ.get('PVE_VERIFY_SSL', 'false').lower() == 'true'
PVE_NODE = os.environ.get('PVE_NODE', 'your_pve_node_name')

APP_SECRET_KEY = os.environ.get('APP_SECRET_KEY', 'a_very_secret_key_for_fastapi')
API_KEY = os.environ.get('API_KEY', 'your_super_secret_api_key')
API_KEY_NAME = "X-API-Key"
