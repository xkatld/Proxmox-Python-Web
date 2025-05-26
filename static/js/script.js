// ===================================
// Configuration
// ===================================
// !!! 重要: 在生产环境中，不应将 API 密钥硬编码在前端 JS 中。
// 这只是一个示例。更好的方法是通过后端认证传递或使用安全的代理。
const API_KEY = "your_chosen_secret_api_key_for_this_app"; // <--- 在这里填入你的 API 密钥
const API_BASE_URL = "/api";
// ===================================

// ===================================
// Utility Functions (Keep as is)
// ===================================
function showToast(message, type = 'info') { /* ... (保持原样) ... */ }
function setButtonProcessing(button, isProcessing) { /* ... (保持原样) ... */ }
// ===================================

// ===================================
// Confirmation Modal (Adjusted)
// ===================================
let currentConfirmAction = null;
let currentConfirmVmid = null; // Changed from name to vmid
let currentConfirmButtonElement = null;

function showConfirmationModal(actionType, vmid, buttonElement) {
    currentConfirmAction = actionType;
    currentConfirmVmid = vmid;
    currentConfirmButtonElement = buttonElement;
    const modalTitle = $('#confirmModalLabel');
    const modalBody = $('#confirmModalBody');
    const confirmButton = $('#confirmActionButton');
    let message = '';
    let buttonClass = 'btn-primary';
    let buttonText = '确认';

    const actionMap = {
        'start': { title: '确认启动', msg: `确定要启动容器 <strong>${vmid}</strong> 吗？`, class: 'btn-success', text: '启动' },
        'stop': { title: '确认停止', msg: `确定要停止容器 <strong>${vmid}</strong> 吗？`, class: 'btn-warning', text: '停止' },
        'reboot': { title: '确认重启', msg: `确定要重启容器 <strong>${vmid}</strong> 吗？`, class: 'btn-warning', text: '重启' },
        'delete': { title: '确认删除容器', msg: `<strong>警告：</strong> 这将永久删除容器 <strong>${vmid}</strong> 及其所有数据！确定删除吗？`, class: 'btn-danger', text: '删除容器' },
    };

    const config = actionMap[actionType];

    if (config) {
        modalTitle.text(config.title);
        message = config.msg;
        buttonClass = config.class;
        buttonText = config.text;
    } else {
        showToast("未知的确认操作类型。", 'danger');
        return;
    }

    modalBody.html(message);
    confirmButton.removeClass('btn-primary btn-warning btn-danger btn-success').addClass(buttonClass).text(buttonText);
    setButtonProcessing(confirmButton, false);
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    confirmModal.show();
}

$('#confirmActionButton').click(function() {
    const actionType = currentConfirmAction;
    const vmid = currentConfirmVmid;
    const buttonElement = currentConfirmButtonElement;
    const confirmButton = $(this);

    if (!actionType || !vmid || !buttonElement) {
        showToast("确认信息丢失，无法执行操作。", 'danger');
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
        if (confirmModal) confirmModal.hide();
        return;
    }

    setButtonProcessing(confirmButton, true);
    setButtonProcessing(buttonElement, true);

    $.ajax({
        url: `${API_BASE_URL}/containers/${vmid}/action`,
        type: 'POST',
        headers: { 'X-API-Key': API_KEY },
        contentType: 'application/json',
        data: JSON.stringify({ action: actionType }),
        success: function(data) {
            showToast(data.message, data.status);
            if (data.status === 'success') {
                setTimeout(() => loadContainers(), 1500); // Reload after action
            }
        },
        error: function(jqXHR) {
            const message = jqXHR.responseJSON ? (jqXHR.responseJSON.detail || "未知错误") : `执行 ${actionType} 操作请求失败。`;
            showToast("操作失败: " + message, 'danger');
            setButtonProcessing(buttonElement, false);
        },
        complete: function() {
            const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
            if (confirmModal) confirmModal.hide();
            setButtonProcessing(confirmButton, false);
            // Don't reset buttonElement here, let reload handle it
        }
    });
});
// ===================================

// ===================================
// Core PVE Functions
// ===================================
function callApi(method, endpoint, data = null, successCallback, errorCallback) {
    const ajaxConfig = {
        url: `${API_BASE_URL}${endpoint}`,
        type: method,
        headers: { 'X-API-Key': API_KEY },
        success: successCallback,
        error: function(jqXHR) {
            const message = jqXHR.responseJSON ? (jqXHR.responseJSON.detail || "API 请求失败") : "API 请求失败";
            showToast(`错误 (${jqXHR.status}): ${message}`, 'danger');
            $('#pveError').text(`错误 (${jqXHR.status}): ${message}`).removeClass('d-none');
            if (errorCallback) {
                errorCallback(jqXHR);
            }
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        ajaxConfig.contentType = 'application/json';
        ajaxConfig.data = JSON.stringify(data);
    } else if (data) {
        ajaxConfig.data = data;
    }

    $.ajax(ajaxConfig);
}

function loadContainers() {
    const desktopList = $('#containerListDesktopItems');
    const mobileList = $('#containerListMobileItems');
    desktopList.html('<div class="py-3 text-center">正在加载容器...</div>');
    mobileList.html('<div class="alert alert-info text-center" role="alert">正在加载容器...</div>');
    $('#pveError').addClass('d-none'); // Hide error on reload

    callApi('GET', '/containers/', null, function(containers) {
        desktopList.empty();
        mobileList.empty();

        if (containers.length === 0) {
            desktopList.html('<div class="py-3 text-center">没有找到 LXC 容器。</div>');
            mobileList.html('<div class="alert alert-info text-center" role="alert">没有找到 LXC 容器。</div>');
            return;
        }

        containers.forEach(c => {
            const statusBadge = `<span class="badge bg-${c.status === 'running' ? 'success' : c.status === 'stopped' ? 'danger' : 'secondary'}">${c.status || '未知'}</span>`;
            const ip = c.ip || '-';
            const name = c.name || `(vmid: ${c.vmid})`;
            const template = c.template || 'N/A'; // Need to fetch this if not provided

            const actionsDropdown = `
                <div class="dropdown actions-dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">操作</button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><button class="dropdown-item" onclick="showInfo(${c.vmid}, this)">信息</button></li>
                        ${c.status === 'running' ? `
                            <li><button class="dropdown-item" onclick="performAction(${c.vmid}, 'stop', this)">停止</button></li>
                            <li><button class="dropdown-item" onclick="performAction(${c.vmid}, 'reboot', this)">重启</button></li>
                            <li><button class="dropdown-item" onclick="openExecModal(${c.vmid})">执行命令</button></li>
                            <li><a class="dropdown-item" href="https://your_pve_ip_or_hostname:8006/#v_lxc_vnc_${c.vmid}" target="_blank">PVE 控制台</a></li>
                        ` : c.status === 'stopped' ? `
                            <li><button class="dropdown-item" onclick="performAction(${c.vmid}, 'start', this)">启动</button></li>
                        ` : ''}
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item text-danger" onclick="performAction(${c.vmid}, 'delete', this)">删除</button></li>
                    </ul>
                </div>`;

            // Desktop Row
            const desktopRow = `
                <div class="custom-container-list-row">
                    <div class="custom-col custom-col-vmid">${c.vmid}</div>
                    <div class="custom-col custom-col-name"><div class="truncate-text" title="${name}">${name}</div></div>
                    <div class="custom-col custom-col-status">${statusBadge}</div>
                    <div class="custom-col custom-col-ip"><div class="truncate-text" title="${ip}">${ip}</div></div>
                    <div class="custom-col custom-col-template"><div class="truncate-text" title="${template}">${template}</div></div>
                    <div class="custom-col custom-col-actions">${actionsDropdown.replace('dropdown-menu-end', '')}</div>
                </div>`;
            desktopList.append(desktopRow);

            // Mobile Card
            const mobileCard = `
                <div class="card mb-3 shadow-sm">
                     <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="card-title mb-0">${c.vmid} - ${name}</h5>
                            ${statusBadge}
                        </div>
                        <p class="card-text mb-1"><small class="text-muted">IP:</small> ${ip}</p>
                        <p class="card-text mb-3"><small class="text-muted">模板:</small> ${template}</p>
                        <div class="card-actions">
                             ${actionsDropdown.replace('dropdown-toggle', 'dropdown-toggle w-100').replace('dropdown-menu-end', 'dropdown-menu-end w-100')}
                        </div>
                    </div>
                </div>`;
            mobileList.append(mobileCard);
        });
    }, function() {
        desktopList.html('<div class="py-3 text-center text-danger">加载容器失败。</div>');
        mobileList.html('<div class="alert alert-danger text-center" role="alert">加载容器失败。</div>');
    });
}

function performAction(vmid, action, buttonElement) {
    showConfirmationModal(action, vmid, buttonElement);
}

function showInfo(vmid, buttonElement) {
    const infoContent = $('#infoContent');
    const infoError = $('#infoError');
    const infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
    $('#infoModalLabel').text(`容器信息: ${vmid}`);
    infoContent.html('正在加载基础信息...');
    infoError.addClass('d-none').text('');
    setButtonProcessing(buttonElement, true);

    callApi('GET', `/containers/${vmid}`, null, function(data) {
        // PVE API returns a lot, we need to format it nicely.
        // The /api/containers/{vmid} should return a curated set or we format here.
        // Assuming we get raw PVE status/config data
        const formattedData = JSON.stringify(data, null, 2);
        infoContent.text(formattedData);
        infoModal.show();
    }, function(jqXHR) {
        const message = jqXHR.responseJSON ? jqXHR.responseJSON.detail : "请求失败。";
        infoContent.html(`<strong>错误:</strong> ${message}`);
        infoError.removeClass('d-none').text(message);
        infoModal.show();
    }, function() {
        setButtonProcessing(buttonElement, false);
    });
    infoModal.show(); // Show modal even if API call fails
    setButtonProcessing(buttonElement, false); // Make sure button is released
}


function loadPveResources() {
    // Load Templates
    callApi('GET', '/containers/utils/templates', { storage: 'local' }, function(templates) { // Assuming 'local' storage, adjust if needed
        const templateSelects = $('#containerTemplate, #containerTemplateMobile');
        templateSelects.empty().append('<option value="" selected disabled>请选择模板</option>');
        templates.forEach(t => {
            // PVE template format is usually "storage:vztmpl/filename.tar.gz"
            templateSelects.append(`<option value="${t.volid}">${t.volid.split('/')[1] || t.volid}</option>`);
        });
    });

    // Load Storage
    callApi('GET', '/containers/utils/storage', null, function(storages) {
        const storageSelects = $('#containerStorage, #containerStorageMobile');
        storageSelects.empty().append('<option value="" selected disabled>请选择存储</option>');
        storages.forEach(s => {
            storageSelects.append(`<option value="${s.storage}">${s.storage} (${s.type})</option>`);
        });
    });
}

function handleCreateContainerFormSubmit(event) {
    event.preventDefault();
    const form = $(this);
    const submitButton = form.find('button[type="submit"]');
    setButtonProcessing(submitButton, true);

    // Create a plain object from form data
    const formData = {};
    form.serializeArray().forEach(item => {
        formData[item.name] = item.value;
    });
    // Ensure numeric fields are numbers
    formData.vmid = parseInt(formData.vmid, 10);
    formData.cpu_cores = parseInt(formData.cpu_cores, 10);
    formData.memory_mb = parseInt(formData.memory_mb, 10);
    formData.disk_gb = parseInt(formData.disk_gb, 10);

    callApi('POST', '/containers/', formData, function(data) {
        showToast(data.message, data.status);
        if (data.status === 'success') {
            form[0].reset();
            if (form.attr('id') === 'createContainerFormMobile') {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createContainerModalMobile'));
                if (modal) modal.hide();
            }
            setTimeout(() => loadContainers(), 1500); // Reload list
        }
    }, function() {
        // Error already handled by callApi
    }, function() {
         setButtonProcessing(submitButton, false);
    });
}

$('#createContainerForm').submit(handleCreateContainerFormSubmit);
$('#createContainerFormMobile').submit(handleCreateContainerFormSubmit);

// ===================================
// Exec Command Functions (Simplified)
// ===================================
function openExecModal(vmid) {
    $('#execContainerVmid').val(vmid);
    $('#execModalLabel').text(`在 ${vmid} 内执行命令`);
    $('#commandInput').val('');
    $('#execOutput').text('');
    $('#execOutput').removeClass('success error');
    setButtonProcessing($('#execButton'), false);
    // loadQuickCommands(true); // Keep if quick commands are implemented
    var execModal = new bootstrap.Modal(document.getElementById('execModal'));
    execModal.show();
}

$('#execCommandForm').submit(function(event) {
    event.preventDefault();
    const form = $(this);
    const submitButton = $('#execButton', form);
    const outputArea = $('#execOutput');
    var vmid = $('#execContainerVmid').val();
    var command = $('#commandInput').val();

    if (!command.trim()) {
        showToast("请输入要执行的命令。", 'warning');
        return;
    }
    outputArea.text('正在提交执行请求...');
    outputArea.removeClass('success error');
    setButtonProcessing(submitButton, true);

    callApi('POST', `/containers/${vmid}/exec`, { command: command }, function(data) {
        outputArea.text(`状态: ${data.status}\n消息: ${data.message}\n详情: ${JSON.stringify(data.details, null, 2)}`);
        outputArea.addClass(data.status === 'success' || data.status === 'warning' ? 'success' : 'error');
        showToast(data.message, data.status);
    }, null, function() {
         setButtonProcessing(submitButton, false);
    });
});

// ===================================
// Quick Commands (Placeholder - Needs Backend)
// ===================================
function loadQuickCommands(populateSelect = false) {
    // This needs backend implementation for /api/quick_commands
    console.warn("Quick commands are not yet implemented with FastAPI backend.");
     $('#quickCommandsList').html('<li class="list-group-item">快捷命令功能待实现。</li>');
     $('#quickCommandSelect').html('<option value="" selected>-- 快捷命令待实现 --</option>');
}
// Add event listeners for quick commands if needed
$('#quickCommandsModal').on('shown.bs.modal', function () { loadQuickCommands(false); });
// ===================================

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    loadContainers();
    loadPveResources(); // Load templates & storage on page load
    loadQuickCommands(true); // Load quick commands on page load
});

// ===================================
// Modal Cleanup (Keep as is)
// ===================================
$('#infoModal').on('hidden.bs.modal', function () { /* ... (保持原样) ... */ });
$('#execModal').on('hidden.bs.modal', function () { /* ... (保持原样) ... */ });
// ===================================
