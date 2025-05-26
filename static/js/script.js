let API_KEY = "your_super_secret_api_key";
let PVE_CONSOLE_URL_BASE = "https://your_pve_ip_or_hostname:8006/";
const API_BASE_URL = "/api";

function showToast(message, type = 'info') {
    let toastType = 'info';
    if (type === 'success') {
        toastType = 'success';
    } else if (type === 'error') {
        toastType = 'danger';
    } else if (type === 'warning') {
        toastType = 'warning';
    }
    const toastContainer = $('#toastContainer');
    const toastHtml = `
        <div class="toast align-items-center text-bg-${toastType} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    const toastElement = $(toastHtml);
    toastContainer.append(toastElement);
    const toast = new bootstrap.Toast(toastElement[0]);
    toast.show();
    toastElement.on('hidden.bs.toast', function () {
        $(this).remove();
    });
}

function setButtonProcessing(button, isProcessing) {
    const $button = $(button);
    if (!$button.length) {
        return;
    }
    if (isProcessing) {
        if (!$button.data('original-html')) {
            $button.data('original-html', $button.html());
            const originalText = $button.text().trim();
            const spinnerHtml = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            $button.html(spinnerHtml + (originalText ? ' 处理中...' : ''));
            $button.addClass('btn-processing').prop('disabled', true);
        }
    } else {
        if ($button.data('original-html')) {
             $button.html($button.data('original-html'));
             $button.data('original-html', null);
             $button.removeClass('btn-processing').prop('disabled', false);
        } else {
             $button.removeClass('btn-processing').prop('disabled', false);
        }
    }
}

let currentConfirmAction = null;
let currentConfirmVmid = null;
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
        modalBody.html(config.msg);
        confirmButton.removeClass('btn-primary btn-warning btn-danger btn-success').addClass(config.class).text(config.text);
    } else {
        showToast("未知的确认操作类型。", 'danger');
        return;
    }

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

    callApi('POST', `/containers/${vmid}/action`, { action: actionType },
        function(data) {
            showToast(data.message, data.status === 'success' ? 'success' : 'error');
            if (data.status === 'success') {
                setTimeout(() => loadContainers(), 2500);
            } else {
                 setButtonProcessing(buttonElement, false);
            }
        },
        function(jqXHR) {
            setButtonProcessing(buttonElement, false);
        },
        function() {
            const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
            if (confirmModal) confirmModal.hide();
            setButtonProcessing(confirmButton, false);
        }
    );
});

$('#confirmModal').on('hidden.bs.modal', function () {
    currentConfirmAction = null;
    currentConfirmVmid = null;
    currentConfirmButtonElement = null;
});

function callApi(method, endpoint, data = null, successCallback, errorCallback = null, completeCallback = null) {
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
        },
        complete: completeCallback
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
    desktopList.html('<div class="py-3 text-center"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 正在加载容器...</div>');
    mobileList.html('<div class="alert alert-info text-center" role="alert"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 正在加载容器...</div>');
    $('#pveError').addClass('d-none');

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
            const template = c.template || '无';
            const consoleLink = `${PVE_CONSOLE_URL_BASE}#v1:0:16:lxc/${c.vmid}:`;

            const actionsDropdown = `
                <div class="dropdown actions-dropdown">
                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">操作</button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><button class="dropdown-item" onclick="showInfo(${c.vmid}, this)">信息</button></li>
                        ${c.status === 'running' ? `
                            <li><button class="dropdown-item" onclick="performAction(${c.vmid}, 'stop', this)">停止</button></li>
                            <li><button class="dropdown-item" onclick="performAction(${c.vmid}, 'reboot', this)">重启</button></li>
                            <li><button class="dropdown-item" onclick="openExecModal(${c.vmid})">执行命令</button></li>
                            <li><a class="dropdown-item" href="${consoleLink}" target="_blank">PVE 控制台</a></li>
                        ` : c.status === 'stopped' ? `
                            <li><button class="dropdown-item" onclick="performAction(${c.vmid}, 'start', this)">启动</button></li>
                        ` : ''}
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item text-danger" onclick="performAction(${c.vmid}, 'delete', this)">删除</button></li>
                    </ul>
                </div>`;

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

            const mobileCard = `
                <div class="card mb-3 shadow-sm">
                     <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="card-title mb-0">${c.vmid} - ${name}</h5>
                            ${statusBadge}
                        </div>
                        <p class="card-text mb-1"><small>IP:</small> ${ip}</p>
                        <p class="card-text mb-3"><small>模板:</small> ${template}</p>
                        <div class="card-actions">
                             ${actionsDropdown.replace('dropdown-toggle', 'dropdown-toggle w-100').replace('dropdown-menu-end', 'dropdown-menu-end w-100')}
                        </div>
                    </div>
                </div>`;
            mobileList.append(mobileCard);
        });
    }, function() {
        desktopList.html('<div class="py-3 text-center text-danger">加载容器失败。请检查 API Key 和 PVE 连接设置。</div>');
        mobileList.html('<div class="alert alert-danger text-center" role="alert">加载容器失败。请检查 API Key 和 PVE 连接设置。</div>');
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

    callApi('GET', `/containers/${vmid}`, null,
        function(data) {
            const formattedData = JSON.stringify(data, null, 2);
            infoContent.text(formattedData);
            infoModal.show();
        },
        function(jqXHR) {
            const message = jqXHR.responseJSON ? jqXHR.responseJSON.detail : "请求失败。";
            infoContent.html(`<strong>错误:</strong> ${message}`);
            infoError.removeClass('d-none').text(message);
            infoModal.show();
        },
        function() {
             setButtonProcessing(buttonElement, false);
        }
    );
}

function loadPveResources() {
    callApi('GET', '/containers/utils/templates', null, function(templates) {
        const templateSelects = $('#containerTemplate, #containerTemplateMobile');
        templateSelects.empty().append('<option value="" selected disabled>请选择模板</option>');
        templates.forEach(t => {
            templateSelects.append(`<option value="${t.volid}">${t.volid.split('/')[1] || t.volid}</option>`);
        });
    }, function() {
        $('#containerTemplate, #containerTemplateMobile').html('<option value="" selected disabled>加载模板失败</option>');
    });

    callApi('GET', '/containers/utils/storage', null, function(storages) {
        const storageSelects = $('#containerStorage, #containerStorageMobile');
        storageSelects.empty().append('<option value="" selected disabled>请选择存储</option>');
        storages.forEach(s => {
            storageSelects.append(`<option value="${s.storage}">${s.storage} (${s.type})</option>`);
        });
    }, function() {
        $('#containerStorage, #containerStorageMobile').html('<option value="" selected disabled>加载存储失败</option>');
    });
}

function handleCreateContainerFormSubmit(event) {
    event.preventDefault();
    const form = $(this);
    const submitButton = form.find('button[type="submit"]');
    setButtonProcessing(submitButton, true);

    const formData = {};
    form.serializeArray().forEach(item => {
        formData[item.name] = item.value;
    });
    formData.vmid = parseInt(formData.vmid, 10);
    formData.cpu_cores = parseInt(formData.cpu_cores, 10);
    formData.memory = parseInt(formData.memory_mb, 10);
    formData.disk = parseInt(formData.disk_gb, 10);

    callApi('POST', '/containers/', formData,
        function(data) {
            showToast(data.message, data.status);
            if (data.status === 'success') {
                form[0].reset();
                if (form.attr('id') === 'createContainerFormMobile') {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('createContainerModalMobile'));
                    if (modal) modal.hide();
                }
                setTimeout(() => loadContainers(), 2500);
            }
        },
        null,
        function() {
             setButtonProcessing(submitButton, false);
        }
    );
}

$('#createContainerForm').submit(handleCreateContainerFormSubmit);
$('#createContainerFormMobile').submit(handleCreateContainerFormSubmit);

function openExecModal(vmid) {
    $('#execContainerVmid').val(vmid);
    $('#execModalLabel').text(`在 ${vmid} 内执行命令`);
    $('#commandInput').val('');
    $('#execOutput').text('');
    $('#execOutput').removeClass('success error');
    setButtonProcessing($('#execButton'), false);
    loadQuickCommands(true);
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

    callApi('POST', `/containers/${vmid}/exec`, { command: command },
        function(data) {
            outputArea.text(`状态: ${data.status}\n消息: ${data.message}\n详情: ${JSON.stringify(data.details, null, 2)}`);
            outputArea.addClass(data.status === 'success' || data.status === 'warning' ? 'success' : 'error');
            showToast(data.message, data.status);
        },
        null,
        function() {
            setButtonProcessing(submitButton, false);
        }
    );
});

$('#useQuickCommandBtn').click(function() {
    const selectedCommand = $('#quickCommandSelect').val();
    if (selectedCommand) {
        $('#commandInput').val(selectedCommand);
    }
});

function loadQuickCommands(populateSelect = false) {
    const list = $('#quickCommandsList');
    const select = $('#quickCommandSelect');
    list.html('');
    select.html('<option value="" selected>-- 选择或手动输入 --</option>');

    try {
        const commands = JSON.parse(localStorage.getItem('quickCommands') || '[]');
        if (commands.length === 0) {
            list.html('<li class="list-group-item">还没有快捷命令。</li>');
             if (populateSelect) {
                 select.html('<option value="" selected>-- 没有快捷命令 --</option>');
             }
        } else {
            commands.forEach((cmd, index) => {
                const safeCommandPreview = cmd.command.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const shortPreview = safeCommandPreview.split('\n')[0].substring(0, 50) + (cmd.command.length > 50 || cmd.command.includes('\n') ? '...' : '');
                const listItem = `
                    <li class="list-group-item d-flex justify-content-between align-items-center" data-command-index="${index}">
                        <span><strong>${cmd.name}:</strong> <code>${shortPreview}</code></span>
                        <button class="btn btn-sm btn-danger" onclick="deleteQuickCommand(${index}, this)">删除</button>
                    </li>`;
                list.append(listItem);
                if (populateSelect) {
                     const optionItem = `<option value="${cmd.command.replace(/"/g, '&quot;')}">${cmd.name}</option`;
                     select.append(optionItem);
                }
            });
        }
    } catch (e) {
        list.html('<li class="list-group-item text-danger">加载本地快捷命令失败。</li>');
        console.error("加载快捷命令失败", e);
    }
}

function addQuickCommand(event) {
    event.preventDefault();
    const nameInput = $('#quickCommandName');
    const commandInput = $('#quickCommandValue');
    const name = nameInput.val().trim();
    const command = commandInput.val().trim();

    if (!name || !command) {
        showToast("名称和命令都不能为空。", 'warning');
        return;
    }

    try {
        const commands = JSON.parse(localStorage.getItem('quickCommands') || '[]');
        if (commands.some(cmd => cmd.name === name)) {
             showToast(`名称为 '${name}' 的快捷命令已存在。`, 'warning');
             return;
        }
        commands.push({ name: name, command: command });
        localStorage.setItem('quickCommands', JSON.stringify(commands));
        showToast("快捷命令已添加。", 'success');
        nameInput.val('');
        commandInput.val('');
        loadQuickCommands(true);
    } catch (e) {
         showToast("添加快捷命令失败。", 'danger');
         console.error("保存快捷命令失败", e);
    }
}

function deleteQuickCommand(index, buttonElement) {
     if (!confirm('确定要删除这个快捷命令吗？')) {
        return;
     }
    try {
        let commands = JSON.parse(localStorage.getItem('quickCommands') || '[]');
        commands.splice(index, 1);
        localStorage.setItem('quickCommands', JSON.stringify(commands));
        showToast("快捷命令已删除。", 'success');
        loadQuickCommands(true);
    } catch (e) {
         showToast("删除快捷命令失败。", 'danger');
         console.error("删除快捷命令失败", e);
    }
}

$('#addQuickCommandForm').submit(addQuickCommand);
$('#quickCommandsModal').on('shown.bs.modal', function () { loadQuickCommands(false); });

document.addEventListener('DOMContentLoaded', function() {
    loadContainers();
    loadPveResources();
    loadQuickCommands(true);
    showToast('请确保已在 config.py 或环境变量中设置 PVE 连接信息和 API_KEY，并在本文件 (script.js) 中设置了相同的 API_KEY！', 'warning');
});

$('#infoModal').on('hidden.bs.modal', function () {
  $('#infoContent').html('...');
  $('#infoError').addClass('d-none').text('');
  $('#infoModalLabel').text('容器信息');
});

$('#execModal').on('hidden.bs.modal', function () {
  $('#execContainerVmid').val('');
  $('#commandInput').val('');
  $('#execOutput').text('');
  $('#execOutput').removeClass('success error');
  $('#execModalLabel').text('在容器内执行命令');
  $('#quickCommandSelect').html('<option value="" selected>-- 选择或手动输入 --</option>');
  setButtonProcessing($('#execButton'), false);
});
