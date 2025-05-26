# Proxmox LXC Web API

一个使用 FastAPI 和 Proxmoxer 构建的，用于管理 Proxmox VE (PVE) LXC 容器的 Web 界面和 API。

## 特性 (规划)

* 通过 Web UI 和 API 列出、创建、启动、停止、删除 LXC 容器。
* 查看容器基本信息 (状态, IP)。
* 通过 API 执行容器内命令。
* 基于 API 密钥的认证。
* 简单的 Web 界面进行基本操作。

## 环境要求

* Proxmox VE 服务器 (确保 API 可访问)。
* Python 3.8+。
* 一个 PVE 用户，最好使用 API Token 进行认证。

## 安装与配置

1.  **克隆项目**:
    ```bash
    git clone <your_repo_url>
    cd pve-api-web
    ```

2.  **安装依赖**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **配置 Proxmox 连接**:
    * **方法一 (推荐): 使用环境变量**
        设置以下环境变量：
        ```bash
        export PVE_HOST="your_pve_ip_or_hostname"
        export PVE_USER="root@pam"
        export PVE_TOKEN_NAME="your_token_name"
        export PVE_TOKEN_VALUE="your_token_value_uuid"
        export PVE_NODE="your_pve_node_name"
        export PVE_VERIFY_SSL="false"
        export API_KEY="your_chosen_secret_api_key_for_this_app"
        ```
    * **方法二: 修改 `config.py`**
        直接编辑 `config.py` 文件，填入你的 PVE 信息和 API 密钥。

4.  **在 Proxmox VE 创建 API Token**:
    * 登录 PVE Web UI。
    * 进入 `Datacenter` -> `Permissions` -> `API Tokens`。
    * 点击 `Add`。
    * 选择一个用户 (例如 `root@pam` 或专用用户)。
    * 输入 Token ID (这就是 `PVE_TOKEN_NAME`)。
    * 取消勾选 `Privilege Separation` (如果需要完整权限)。
    * 点击 `Add`。
    * **重要**: 复制并保存好 `Token ID` 和 `Secret` (`PVE_TOKEN_VALUE`)，Secret 只会显示一次！

## 运行项目

```bash
python main.py
