# Proxmox LXC Web API

一个使用 FastAPI 和 Proxmoxer 构建的，用于管理 Proxmox VE (PVE) LXC 容器的 Web 界面和 API。

## 特性

* 通过 Web UI 和 API 列出 LXC 容器。
* 查看容器基本信息 (VMID, 名称, 状态, IP 地址, 模板)。
* 通过 Web UI 和 API 创建 LXC 容器。
* 通过 Web UI 和 API 启动、停止、重启 LXC 容器。
* 通过 Web UI 和 API 删除 LXC 容器 (会先尝试停止运行中的容器)。
* 通过 API 执行容器内命令 (注意: 命令执行可能不直接返回输出，而是返回任务状态)。
* 通过 Web UI 执行容器内命令并查看简化的输出信息。
* 基于 API 密钥的认证保护 API 接口。
* 简单的 Web 界面进行上述基本操作，包括：
    * 实时刷新容器列表。
    * 创建容器的表单 (桌面版和移动版弹出窗口)。
    * 容器操作的确认提示框。
    * 查看容器详细配置信息 (JSON 格式)。
    * 执行命令的模态框，支持选择预存的快捷命令。
    * 管理 (添加/删除) 存储在浏览器本地的快捷命令。
    * 动态加载 PVE 存储和模板列表用于创建容器。
    * 响应式布局，适配桌面和移动端。
* API 端点列出可用的 PVE 存储和 LXC 模板。
* 提供健康检查端点 (`/health`)。

## 环境要求

* Proxmox VE 服务器 (确保 API 可访问)。
* Python 3.8+。
* 一个 PVE 用户 (例如 `root@pam`)，用于后端连接 Proxmox API。该项目当前版本**使用密码认证**连接PVE。
* (可选但推荐) PVE API Token，如果未来版本支持 Token 认证。

## 安装与配置

1.  **克隆项目**:
    ```bash
    git clone <your_repo_url>
    cd Proxmox-Python-Web
    ```

2.  **安装依赖**:
    ```bash
    pip install -r requirements.txt
    ```
   

3.  **配置应用**:
    * **方法一 (推荐): 使用环境变量**
        设置以下环境变量：
        ```bash
        export PVE_HOST="your_pve_ip_or_hostname"
        export PVE_USER="your_pve_user"  # 例如 root@pam
        export PVE_PASSWORD="your_pve_user_password"
        export PVE_NODE="your_pve_node_name" # PVE 节点名称
        export PVE_VERIFY_SSL="false" # 如果 PVE 使用自签名证书，设为 false
        export API_KEY="your_chosen_secret_api_key_for_this_app" # 用于保护本应用的 API
        ```
    * **方法二: 修改 `config.py`**
        直接编辑 `config.py` 文件，填入你的 PVE 连接信息和应用 API 密钥。
        ```python
        PVE_HOST = "your_pve_ip_or_hostname"
        PVE_USER = "root@pam" # 或者其他 PVE 用户
        PVE_PASSWORD = "your_pve_password"
        PVE_VERIFY_SSL = False # 或者 True
        PVE_NODE = "your_pve_node_name" # PVE 节点名

        API_KEY = "your_super_secret_api_key" # 应用的 API Key
        API_KEY_NAME = "X-API-Key" # API Key 在请求头中的名称
        ```

4.  **配置前端 `script.js`**:
    打开 `static/js/script.js` 文件，修改以下两行以匹配你的配置：
    ```javascript
    let API_KEY = "your_super_secret_api_key"; // 必须与 config.py 或环境变量中的 API_KEY 一致
    let PVE_CONSOLE_URL_BASE = "https://your_pve_ip_or_hostname:8006/"; // 用于跳转到 PVE Web 控制台
    ```
    **重要**: `API_KEY` 必须与后端配置的 `API_KEY` 完全一致，否则前端无法通过认证。

## 运行项目

```bash
python main.py
