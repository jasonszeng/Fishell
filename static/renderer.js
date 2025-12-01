document.addEventListener('DOMContentLoaded', () => {
    // Puter.js 会自动加载和初始化，我们不需要做任何事情

    // --- 全局状态 ---
    let servers = [];

    // --- DOM 元素 ---
    const sessionGrid = document.getElementById('session-grid');
    // const serverCountBadge = document.getElementById('server-count-badge'); // Removed
    const paginationText = document.getElementById('pagination-text');

    // Tab Elements
    const tabGroup = document.getElementById('tab-group');
    const dashboardContainer = document.getElementById('dashboard-container');
    const noticeContainer = document.getElementById('notice-container');
    const settingsContainer = document.getElementById('settings-container');
    const terminalsContainer = document.getElementById('terminals-container');

    // Modal Elements (Edit/New)
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const btnNewSession = document.getElementById('btn-new-session');
    const btnSave = document.getElementById('btn-save');
    const closeButtons = document.querySelectorAll('.close-modal');

    // Modal Elements (Details)
    const modalDetailsOverlay = document.getElementById('modal-details-overlay');
    const closeDetailsButtons = document.querySelectorAll('.close-details');
    const detailName = document.getElementById('detail-name');
    const detailStatus = document.getElementById('detail-status');
    const detailHost = document.getElementById('detail-host');
    const detailPort = document.getElementById('detail-port');
    const detailUser = document.getElementById('detail-user');
    const detailAdded = document.getElementById('detail-added');
    const detailCpu = document.getElementById('detail-cpu');
    const detailMem = document.getElementById('detail-mem');
    const detailDisk = document.getElementById('detail-disk');
    const detailRemark = document.getElementById('detail-remark-edit');
    // const btnSaveRemark = document.getElementById('btn-save-remark'); // Removed
    const detailOs = document.getElementById('detail-os');
    let currentDetailId = null;


    // Form Inputs
    const inputName = document.getElementById('input-name');
    const inputHost = document.getElementById('input-host');
    // 添加IP地址实时验证
    if (inputHost) {
        inputHost.addEventListener('input', (e) => {
            const host = e.target.value.trim();
            if (host && !validateIP(host)) {
                e.target.style.borderColor = '#ef4444';
            } else {
                e.target.style.borderColor = '';
            }
        });
        inputHost.addEventListener('blur', (e) => {
            const host = e.target.value.trim();
            if (host && !validateIP(host)) {
                e.target.style.borderColor = '#ef4444';
                showToast('IP地址格式不正确', 'error');
            } else {
                e.target.style.borderColor = '';
            }
        });
    }
    const inputPort = document.getElementById('input-port');
    const inputUser = document.getElementById('input-user');
    const inputPassword = document.getElementById('input-password');
    // const inputGroup = document.getElementById('input-group'); // Removed
    const inputRemark = document.getElementById('input-remark');
    const authRadios = document.querySelectorAll('input[name="auth-method"]');
    
    // SSH Key Elements
    const passwordRow = document.getElementById('password-row');
    const keyFileRow = document.getElementById('key-file-row');
    const keyPassphraseRow = document.getElementById('key-passphrase-row');
    const inputKeyFile = document.getElementById('input-key-file');
    const inputKeyPath = document.getElementById('input-key-path');
    const btnSelectKey = document.getElementById('btn-select-key');
    const inputKeyPassphrase = document.getElementById('input-key-passphrase');
    const keyPassphraseToggle = document.getElementById('key-passphrase-toggle');

    // Settings Elements
    const themeSelect = document.getElementById('theme-select');
    const btnExport = document.getElementById('btn-export-json');
    const btnImport = document.getElementById('btn-import-json');
    const fileImport = document.getElementById('file-import');

    const nameCount = document.getElementById('name-count');
    const remarkCount = document.getElementById('remark-count');
    const passwordToggle = document.getElementById('password-toggle');
    const tabAddBtn = document.getElementById('tab-add-btn');

    // Lock Screen Elements
    const lockScreen = document.getElementById('lock-screen');
    const inputUnlockPwd = document.getElementById('input-unlock-pwd');
    const btnUnlock = document.getElementById('btn-unlock');
    const settingLockApp = document.getElementById('setting-lock-app');
    const lockScreenContent = document.querySelector('.lock-screen-content');
    const modalPwdOverlay = document.getElementById('modal-password-overlay');
    const btnSavePwd = document.getElementById('btn-save-pwd');
    const closePwdBtns = document.querySelectorAll('.close-pwd-modal');
    const inputNewPwd = document.getElementById('input-new-pwd');
    const inputConfirmPwd = document.getElementById('input-confirm-pwd');

    let currentEditingId = null;

    // --- Custom Dialogs (Alert/Confirm) ---
    const dialogOverlay = document.getElementById('custom-dialog-overlay');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMsg = document.getElementById('dialog-message');
    const dialogIcon = document.getElementById('dialog-icon');
    const btnDialogConfirm = document.getElementById('dialog-btn-confirm');
    const btnDialogCancel = document.getElementById('dialog-btn-cancel');

    let dialogResolve = null;

    // --- IP 地址验证函数 ---
    function validateIP(ip) {
        if (!ip || typeof ip !== 'string') return false;
        // IPv4 格式验证: xxx.xxx.xxx.xxx (0-255.0-255.0-255.0-255)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // 也支持域名格式验证（基本检查）
        const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        // 也支持 localhost
        return ipv4Regex.test(ip) || domainRegex.test(ip) || ip === 'localhost' || ip === '127.0.0.1';
    }

    function showDialog(type, message, title = '') {
        return new Promise((resolve) => {
            dialogResolve = resolve;
            dialogMsg.innerText = message;

            if (type === 'confirm') {
                // 删除确认对话框：不显示标题和图标，只显示消息
                if (title === '') {
                    dialogTitle.style.display = 'none'; // 隐藏标题
                } else {
                    dialogTitle.innerText = title || '确认操作';
                    dialogTitle.style.display = 'block';
                }
                dialogIcon.style.display = 'none'; // 隐藏图标容器
                btnDialogCancel.classList.remove('hidden');
                btnDialogConfirm.innerText = '确定';
                btnDialogConfirm.style.backgroundColor = 'var(--accent-blue)';
            } else {
                dialogTitle.innerText = title || '提示';
                dialogTitle.style.display = 'block';
                dialogIcon.style.display = 'none'; // 隐藏图标容器
                btnDialogCancel.classList.add('hidden');
                btnDialogConfirm.innerText = '知道了';
            }

            dialogOverlay.classList.remove('hidden');
            btnDialogConfirm.focus();
        });
    }

    btnDialogConfirm.addEventListener('click', () => {
        dialogOverlay.classList.add('hidden');
        if (dialogResolve) {
            dialogResolve(true);
            dialogResolve = null; // 清除引用
        }
    });

    btnDialogCancel.addEventListener('click', () => {
        dialogOverlay.classList.add('hidden');
        if (dialogResolve) {
            dialogResolve(false);
            dialogResolve = null; // 清除引用
        }
    });

    // 点击遮罩层也关闭对话框并返回false
    if (dialogOverlay) {
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                dialogOverlay.classList.add('hidden');
                if (dialogResolve) {
                    dialogResolve(false);
                    dialogResolve = null;
                }
            }
        });
    }

    // 覆盖原生方法
    window.alert = (msg) => showDialog('alert', msg);
    window.confirm = (msg) => showDialog('confirm', msg);

    // --- Context Menu ---
    const ctxMenu = document.getElementById('context-menu');
    const ctxCopy = document.getElementById('ctx-copy');
    const ctxPaste = document.getElementById('ctx-paste');
    const ctxSelectAll = document.getElementById('ctx-select-all');
    const ctxClear = document.getElementById('ctx-clear');
    let currentTermInstance = null;
    let currentTermSession = null; // 保存当前终端会话引用

    document.addEventListener('click', () => ctxMenu.classList.add('hidden'));

    // 绑定到终端容器（事件委托）
    if (terminalsContainer) {
        terminalsContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // 找到对应的 terminal 对象
            const termEl = e.target.closest('.terminal-instance');
            if (!termEl) return;

            const termId = termEl.id.replace('term-', '');
            const session = tabs.tabs.get(termId);
            if (session && session.instance) {
                currentTermInstance = session.instance.term;
                currentTermSession = session.instance; // 保存会话引用以便粘贴使用

                // 定位菜单
                ctxMenu.style.left = `${e.clientX}px`;
                ctxMenu.style.top = `${e.clientY}px`;
                ctxMenu.classList.remove('hidden');
            }
        });
    }

    if (ctxCopy) ctxCopy.addEventListener('click', () => {
        if (currentTermInstance && currentTermInstance.hasSelection()) {
            const text = currentTermInstance.getSelection();
            navigator.clipboard.writeText(text);
            showToast('已复制');
        }
    });

    if (ctxPaste) ctxPaste.addEventListener('click', () => {
        if (currentTermInstance && currentTermSession) {
            // 检查剪贴板API是否可用
            if (!navigator.clipboard) {
                showToast('剪贴板功能不可用，请使用 Ctrl+V 粘贴');
                return;
            }

            navigator.clipboard.readText().then(text => {
                if (text) {
                    // 直接发送数据到后端 SSH 连接
                    if (currentTermSession.server && currentTermSession.server.id) {
                        window.pywebview.api.ssh_send(currentTermSession.server.id, text);
                        showToast('已粘贴');
                    }
                }
            }).catch(err => {
                console.error('粘贴失败:', err);
                // 如果是权限错误，提供更友好的提示
                if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                    showToast('需要剪贴板权限，请在浏览器提示中点击"允许"');
                } else {
                    showToast('粘贴失败，请使用 Ctrl+V 粘贴');
                }
            });
        }
    });

    if (ctxSelectAll) ctxSelectAll.addEventListener('click', () => {
        if (currentTermInstance) currentTermInstance.selectAll();
    });

    if (ctxClear) ctxClear.addEventListener('click', () => {
        if (currentTermInstance) currentTermInstance.clear();
    });

    // --- Global Keydown Handler (Esc to go back/close) ---
    document.addEventListener('keydown', (e) => {

        if (e.key === 'Escape') {
            // Priority 1: Custom Dialog (Alert/Confirm)
            const dialogOverlay = document.getElementById('custom-dialog-overlay');
            if (dialogOverlay && !dialogOverlay.classList.contains('hidden')) {
                const cancelBtn = document.getElementById('dialog-btn-cancel');
                if (!cancelBtn.classList.contains('hidden')) {
                    cancelBtn.click(); // Trigger Cancel
                } else {
                    document.getElementById('dialog-btn-confirm').click(); // Or Confirm for simple alerts
                }
                return;
            }

            // Priority 2: Context Menu
            const ctxMenu = document.getElementById('context-menu');
            if (ctxMenu && !ctxMenu.classList.contains('hidden')) {
                ctxMenu.classList.add('hidden');
                return;
            }

            // Priority 3: Edit/New Server Modal
            const modalOverlay = document.getElementById('modal-overlay');
            if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
                closeModal();
                return;
            }

            // Priority 4: Server Details Modal
            const detailsOverlay = document.getElementById('modal-details-overlay');
            if (detailsOverlay && !detailsOverlay.classList.contains('hidden')) {
                detailsOverlay.classList.add('hidden');
                return;
            }

            // Priority 5: Password Set Modal
            const pwdOverlay = document.getElementById('modal-password-overlay');
            if (pwdOverlay && !pwdOverlay.classList.contains('hidden')) {
                pwdOverlay.classList.add('hidden');
                return;
            }

            // Priority 6: Close Settings Tab (Back to previous)
            if (tabs.activeTabId === 'settings') {
                tabs.close('settings');
                return;
            }
        }
    });

    // --- Toast Notification ---
    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.innerText = msg;
        const bgColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(129, 71, 252, 0.9)';
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: ${bgColor}; color: white; padding: 8px 16px;
            border-radius: 20px; font-size: 0.85rem; z-index: 3000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: fadeIn 0.3s ease-out;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // --- App Lock Logic - 只锁住机器管理页面 ---
    let autoLockTimer = null;
    let lastActivityTime = Date.now();

    // 检查是否需要显示锁屏
    async function checkLock() {
        try {
            let isLocked = localStorage.getItem('isLocked') === 'true';
            let hasPwd = false;
            let needsUnlock = false;
            
            if (window.pywebview) {
                if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.has_app_password === 'function') {
                    hasPwd = await window.pywebview.api.has_app_password();
                } else {
                    hasPwd = false;
                }
                
                // 检查是否需要解锁（有密码但没有加密密钥）
                if (window.pywebview.api && typeof window.pywebview.api.is_locked === 'function') {
                    needsUnlock = await window.pywebview.api.is_locked();
                    // 如果需要解锁，强制设置为锁定状态
                    if (needsUnlock) {
                        isLocked = true;
                        localStorage.setItem('isLocked', 'true');
                    }
                }
            }

            // 只在机器管理页面（dashboard）显示锁屏
            let isDashboard = false;
            try {
                if (typeof tabs !== 'undefined' && tabs && tabs.activeTabId) {
                    isDashboard = tabs.activeTabId === 'dashboard';
                } else {
                    isDashboard = dashboardContainer && !dashboardContainer.classList.contains('hidden');
                }
            } catch (e) {
                isDashboard = dashboardContainer && !dashboardContainer.classList.contains('hidden');
            }

            if (isLocked && hasPwd && isDashboard) {
                if (lockScreen) lockScreen.classList.remove('hidden');
                // 重置输入状态
                if (lockScreenContent) {
                    lockScreenContent.classList.remove('input-active', 'unlocking');
                }
                if (inputUnlockPwd) {
                    inputUnlockPwd.value = '';
                    // 确保输入框始终可以接收输入
                    inputUnlockPwd.style.pointerEvents = 'all';
                    inputUnlockPwd.style.zIndex = '10';
                }
                const lockScreenDots = document.getElementById('lock-screen-dots');
                if (lockScreenDots) lockScreenDots.textContent = '';
                // 隐藏机器管理内容
                if (dashboardContainer) {
                    dashboardContainer.style.pointerEvents = 'none';
                    dashboardContainer.style.opacity = '0.3';
                }
                // 自动聚焦输入框（立即聚焦）
                setTimeout(() => {
                    if (inputUnlockPwd) {
                        inputUnlockPwd.focus();
                        // 如果失去焦点，重新聚焦
                        const refocus = () => {
                            if (lockScreen && !lockScreen.classList.contains('hidden')) {
                                inputUnlockPwd.focus();
                            }
                        };
                        // 监听点击事件，确保点击后重新聚焦
                        lockScreen.addEventListener('click', refocus, { once: true });
                    }
                }, 100);
            } else {
                if (lockScreen) lockScreen.classList.add('hidden');
                // 重置输入状态
                if (lockScreenContent) {
                    lockScreenContent.classList.remove('input-active');
                }
                if (inputUnlockPwd) {
                    inputUnlockPwd.value = '';
                    inputUnlockPwd.style.pointerEvents = 'none';
                }
                const lockScreenDots = document.getElementById('lock-screen-dots');
                if (lockScreenDots) lockScreenDots.textContent = '';
                // 恢复机器管理内容
                if (dashboardContainer) {
                    dashboardContainer.style.pointerEvents = '';
                    dashboardContainer.style.opacity = '';
                }
            }
            if (settingLockApp) settingLockApp.checked = isLocked;
        } catch (e) {
            console.error('checkLock error:', e);
        }
    }

    // 重置自动锁定计时器
    function resetAutoLockTimer() {
        if (autoLockTimer) {
            clearTimeout(autoLockTimer);
            autoLockTimer = null;
        }

        const autoLockTime = parseInt(localStorage.getItem('autoLockTime') || '0');
        let isLocked = localStorage.getItem('isLocked') === 'true';
        let hasPwd = false;
        if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.has_app_password === 'function') {
            window.pywebview.api.has_app_password().then(async result => {
                hasPwd = result;
                
                // 检查是否需要强制解锁
                if (window.pywebview.api && typeof window.pywebview.api.is_locked === 'function') {
                    const needsUnlock = await window.pywebview.api.is_locked();
                    if (needsUnlock) {
                        isLocked = true;
                        localStorage.setItem('isLocked', 'true');
                    }
                }
                
                // 只有在启用应用锁且有密码时才启动自动锁定
                if (autoLockTime > 0 && isLocked && hasPwd) {
                    autoLockTimer = setTimeout(() => {
                        // 检查是否在dashboard页面
                        let isDashboard = false;
                        try {
                            if (typeof tabs !== 'undefined' && tabs && tabs.activeTabId) {
                                isDashboard = tabs.activeTabId === 'dashboard';
                            } else {
                                isDashboard = dashboardContainer && !dashboardContainer.classList.contains('hidden');
                            }
                        } catch (e) {
                            isDashboard = dashboardContainer && !dashboardContainer.classList.contains('hidden');
                        }

                        // 只有在dashboard页面时才自动锁定
                        if (isDashboard) {
                            localStorage.setItem('isLocked', 'true');
                            // 自动保存到文件
                            saveSettingToFile('isLocked', 'true');
                            checkLock();
                        }
                    }, autoLockTime * 60 * 1000); // 转换为毫秒
                }
            }).catch(err => {
                console.error('Error checking password for auto-lock:', err);
            });
        }
    }

    // 用户活动监听
    function updateActivityTime() {
        lastActivityTime = Date.now();
        resetAutoLockTimer();
    }

    // 监听用户活动
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        document.addEventListener(event, updateActivityTime, { passive: true });
    });

    // 锁定界面逻辑
    const lockScreenDots = document.getElementById('lock-screen-dots');
    let isHoveringDots = false;

    // 更新密码显示
    function updatePasswordDisplay() {
        if (!lockScreenDots || !inputUnlockPwd) return;
        const value = inputUnlockPwd.value;
        if (isHoveringDots && value) {
            // 鼠标悬停时显示数字
            lockScreenDots.textContent = value;
            lockScreenDots.style.letterSpacing = '2px';
        } else {
            // 默认显示星号
            lockScreenDots.textContent = '•'.repeat(value.length);
            lockScreenDots.style.letterSpacing = '4px';
        }
    }

    // 鼠标悬停事件
    if (lockScreenDots) {
        lockScreenDots.addEventListener('mouseenter', () => {
            isHoveringDots = true;
            updatePasswordDisplay();
        });
        lockScreenDots.addEventListener('mouseleave', () => {
            isHoveringDots = false;
            updatePasswordDisplay();
        });
    }

    if (inputUnlockPwd) {
        // 监听输入
        inputUnlockPwd.addEventListener('input', () => {
            const value = inputUnlockPwd.value;
            // 如果有输入，确保显示区域可见，logo上移
            if (value && !lockScreenContent.classList.contains('input-active')) {
                lockScreenContent.classList.add('input-active');
            }
            // 如果删除完密码，logo回到原位
            if (!value && lockScreenContent.classList.contains('input-active')) {
                lockScreenContent.classList.remove('input-active');
            }
            updatePasswordDisplay();
        });

        const unlock = async () => {
            if (!window.pywebview) return;
            const pwd = inputUnlockPwd.value;
            const isValid = await window.pywebview.api.verify_app_password(pwd);

            if (isValid) {
                // 解锁成功，直接淡出锁屏并显示主页
                if (lockScreenContent) {
                    lockScreenContent.classList.add('unlocking');
                }

                // 立即隐藏锁屏，显示主页动画
                localStorage.setItem('isLocked', 'false');
                // 自动保存到文件
                saveSettingToFile('isLocked', 'false');

                // 恢复机器管理内容，添加淡入效果
                if (dashboardContainer) {
                    dashboardContainer.style.pointerEvents = '';
                    dashboardContainer.style.opacity = '';
                    dashboardContainer.style.animation = 'uiFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                }

                // 为整体容器添加解锁完成动画
                const appContainer = document.querySelector('.app-container');
                if (appContainer) {
                    appContainer.classList.add('unlocking-complete');
                    setTimeout(() => {
                        appContainer.classList.remove('unlocking-complete');
                    }, 600);
                }

                // 延迟隐藏锁屏，等待淡出动画
                setTimeout(() => {
                    lockScreen.classList.add('hidden');
                    inputUnlockPwd.value = '';
                    lockScreenContent.classList.remove('input-active', 'unlocking');
                    isHoveringDots = false;
                    if (lockScreenDots) {
                        lockScreenDots.textContent = '';
                        lockScreenDots.style.letterSpacing = '4px';
                    }
                    // 重置自动锁定计时器
                    resetAutoLockTimer();
                }, 400);
            } else {
                // 密码错误，直接清空输入并重新聚焦，不显示任何错误提示
                inputUnlockPwd.value = '';
                updatePasswordDisplay();
                // 如果输入被清空，logo回到原位
                if (lockScreenContent && lockScreenContent.classList.contains('input-active')) {
                    lockScreenContent.classList.remove('input-active');
                }
                // 重新聚焦输入框
                setTimeout(() => {
                    inputUnlockPwd.focus();
                }, 50);
            }
        };

        inputUnlockPwd.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') unlock();
        });

        // 失去焦点时，重新聚焦以确保可以继续输入
        inputUnlockPwd.addEventListener('blur', () => {
            // 如果锁屏还在显示，重新聚焦输入框
            if (lockScreen && !lockScreen.classList.contains('hidden')) {
                setTimeout(() => {
                    inputUnlockPwd.focus();
                }, 50);
            }
            // 如果为空则隐藏显示区域
            setTimeout(() => {
                if (!inputUnlockPwd.value && lockScreenContent) {
                    lockScreenContent.classList.remove('input-active');
                    if (lockScreenDots) {
                        lockScreenDots.textContent = '';
                        lockScreenDots.style.letterSpacing = '4px';
                    }
                }
            }, 200);
        });

        // 锁定界面显示时自动聚焦
        if (lockScreen) {
            const observer = new MutationObserver(() => {
                if (!lockScreen.classList.contains('hidden') && inputUnlockPwd) {
                    setTimeout(() => {
                        inputUnlockPwd.focus();
                    }, 100);
                }
            });
            observer.observe(lockScreen, { attributes: true, attributeFilter: ['class'] });

            // 点击锁屏任意位置时重新聚焦输入框
            lockScreen.addEventListener('click', (e) => {
                // 如果点击的不是输入框本身，重新聚焦
                if (e.target !== inputUnlockPwd && inputUnlockPwd) {
                    setTimeout(() => {
                        inputUnlockPwd.focus();
                    }, 50);
                }
            });
        }
    }

    // 添加错误动画
    if (!document.getElementById('lock-screen-shake-style')) {
        const style = document.createElement('style');
        style.id = 'lock-screen-shake-style';
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                20%, 40%, 60%, 80% { transform: translateX(10px); }
            }
        `;
        document.head.appendChild(style);
    }

    // 标记是否从应用锁开关触发密码设置（需要在外部作用域，供应用锁开关和密码保存按钮共享）
    let isSettingPwdFromLockSwitch = false;

    if (settingLockApp) {
        settingLockApp.addEventListener('change', async (e) => {
            if (e.target.checked) {
                let hasPwd = false;
                if (window.pywebview) {
                    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.has_app_password === 'function') {
                    hasPwd = await window.pywebview.api.has_app_password();
                } else {
                    hasPwd = false;
                }
                }

                if (!hasPwd) {
                    // 没有密码，提示设置密码
                    e.target.checked = false; // 先取消选中
                    isSettingPwdFromLockSwitch = true;
                    if (modalPwdOverlay) {
                        modalPwdOverlay.classList.remove('hidden');
                        if (inputNewPwd) inputNewPwd.focus();
                    }
                    showToast('请先设置应用锁密码');
                } else {
                    localStorage.setItem('isLocked', 'true');
                    saveSettingToFile('isLocked', 'true');
                    showToast('应用锁已开启');
                    resetAutoLockTimer(); // 启动自动锁定计时器
                }
            } else {
                // 关闭应用锁时，删除密码
                if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.remove_app_password === 'function') {
                    try {
                        await window.pywebview.api.remove_app_password();
                    } catch (e) {
                        console.error('删除密码失败:', e);
                    }
                }
                localStorage.setItem('isLocked', 'false');
                saveSettingToFile('isLocked', 'false');
                showToast('应用锁已关闭，密码已删除');
                if (autoLockTimer) clearTimeout(autoLockTimer); // 清除计时器
                // 立即检查锁定状态，确保界面更新
                setTimeout(() => {
                    if (typeof checkLock === 'function') {
                        checkLock();
                    }
                }, 100);
            }
        });
    }

    // 自动锁定时间设置
    const settingAutoLockTime = document.getElementById('setting-auto-lock-time');
    if (settingAutoLockTime) {
        const savedAutoLockTime = localStorage.getItem('autoLockTime') || '0';
        settingAutoLockTime.value = savedAutoLockTime;
        settingAutoLockTime.addEventListener('change', async (e) => {
            const time = parseInt(e.target.value);
            localStorage.setItem('autoLockTime', time.toString());
            // 自动保存到文件
            await saveSettingToFile('autoLockTime', time.toString());
            resetAutoLockTimer();
            if (time > 0) {
                showToast(`自动锁定已设置为 ${time} 分钟`);
            } else {
                showToast('自动锁定已禁用');
            }
        });
    }

    // 防止截图录屏设置
    const settingPreventScreenshot = document.getElementById('setting-prevent-screenshot');
    if (settingPreventScreenshot) {
        // 加载保存的设置
        const savedPreventScreenshot = localStorage.getItem('preventScreenshot') === 'true';
        settingPreventScreenshot.checked = savedPreventScreenshot;

        // 初始化时明确应用设置（无论开启还是关闭都要设置）
        if (window.pywebview && window.pywebview.api) {
            // 延迟执行，确保窗口已完全初始化
            setTimeout(() => {
                window.pywebview.api.set_prevent_screenshot(savedPreventScreenshot).catch(err => {
                    console.error('初始化防止截图设置失败:', err);
                });
            }, 500);
        }

        settingPreventScreenshot.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            localStorage.setItem('preventScreenshot', enabled.toString());
            // 自动保存到文件
            await saveSettingToFile('preventScreenshot', enabled.toString());

            // 调用后端API设置防止截图
            if (window.pywebview && window.pywebview.api) {
                try {
                    const result = await window.pywebview.api.set_prevent_screenshot(enabled);
                    if (result && result.success) {
                        showToast(enabled ? '防止截图录屏已启用' : '防止截图录屏已禁用');
                    } else {
                        // 如果设置失败，恢复复选框状态
                        settingPreventScreenshot.checked = !enabled;
                        localStorage.setItem('preventScreenshot', (!enabled).toString());
                        showToast(result?.message || '设置失败，可能系统版本不支持');
                    }
                } catch (err) {
                    // 如果调用失败，恢复复选框状态
                    settingPreventScreenshot.checked = !enabled;
                    localStorage.setItem('preventScreenshot', (!enabled).toString());
                    showToast('设置失败: ' + err.message);
                }
            }
        });
    }

    // 修改密码链接
    const linkModifyPassword = document.getElementById('link-modify-password');
    if (linkModifyPassword) {
        linkModifyPassword.addEventListener('click', (e) => {
            e.preventDefault();
            // 确保不是从应用锁开关触发的（修改密码时）
            isSettingPwdFromLockSwitch = false;
            if (modalPwdOverlay) {
                modalPwdOverlay.classList.remove('hidden');
                if (inputNewPwd) inputNewPwd.focus();
            }
        });
    }

    // Pwd Modal
    if (btnSavePwd) {
        btnSavePwd.addEventListener('click', async () => {
            const p1 = inputNewPwd.value;
            const p2 = inputConfirmPwd.value;
            if (p1 && p1 === p2) {
                // 保存密码到后端 (Hash)
                if (window.pywebview) {
                    await window.pywebview.api.set_app_password(p1);
                }
                // 移除本地存储的明文密码 (如果存在)
                localStorage.removeItem('appPassword');

                // 自动保存到文件 (set_app_password 已经处理了保存，这里不需要再调用 saveSettingToFile 保存密码)

                // 如果是从应用锁开关触发的，自动开启应用锁
                if (isSettingPwdFromLockSwitch) {
                    localStorage.setItem('isLocked', 'true');
                    saveSettingToFile('isLocked', 'true');
                    if (settingLockApp) settingLockApp.checked = true;
                    showToast('密码设置成功，应用锁已开启');
                    resetAutoLockTimer(); // 启动自动锁定计时器
                } else {
                    // 如果是修改密码，保持当前应用锁状态
                    showToast('密码设置成功');
                }

                modalPwdOverlay.classList.add('hidden');
                // 清空输入框
                if (inputNewPwd) inputNewPwd.value = '';
                if (inputConfirmPwd) inputConfirmPwd.value = '';
                isSettingPwdFromLockSwitch = false; // 重置标志
            } else {
                showDialog('alert', '密码不一致或为空');
            }
        });
    }

    // 关闭密码对话框的函数
    const closePwdModal = () => {
        if (modalPwdOverlay) {
            modalPwdOverlay.classList.add('hidden');
            // 清空输入框
            if (inputNewPwd) inputNewPwd.value = '';
            if (inputConfirmPwd) inputConfirmPwd.value = '';
            // 如果是从应用锁开关触发的，确保应用锁保持关闭状态
            if (isSettingPwdFromLockSwitch) {
                if (settingLockApp) settingLockApp.checked = false;
                isSettingPwdFromLockSwitch = false;
            }
        }
    };

    // 关闭密码对话框时，如果是从应用锁开关触发的，重置标志
    closePwdBtns.forEach(b => b.addEventListener('click', closePwdModal));

    // 点击遮罩层也可以关闭对话框
    if (modalPwdOverlay) {
        modalPwdOverlay.addEventListener('click', (e) => {
            if (e.target === modalPwdOverlay) {
                closePwdModal();
            }
        });
    }

    // --- Window Controls (PyWebview API) ---
    const winMinimize = document.getElementById('win-minimize');
    const winMaximize = document.getElementById('win-maximize');
    const winClose = document.getElementById('win-close');

    if (winMinimize) {
        winMinimize.addEventListener('click', () => {
            if (window.pywebview) window.pywebview.api.minimize_window();
        });
    }
    if (winMaximize) {
        winMaximize.addEventListener('click', () => {
            if (window.pywebview) window.pywebview.api.maximize_window();
        });
    }
    if (winClose) {
        winClose.addEventListener('click', () => {
            if (window.pywebview) window.pywebview.api.close_window();
        });
    }

    // --- Manual Drag Fallback ---
    // 只有当 CSS 拖拽失效时（例如被遮挡），此 JS 事件才会触发并调用后端进行拖拽
    // 确保监听器覆盖整个头部和侧边栏空白区域
    // 使用 mousedown + preventDefault 来防止文本选择干扰拖拽
    const dragRegions = [document.getElementById('tab-container-wrapper'), document.querySelector('.sidebar')];

    dragRegions.forEach(region => {
        if (!region) return;
        region.addEventListener('mousedown', (e) => {
            // 排除交互元素
            if (e.target.closest('.tab-item') ||
                e.target.closest('.window-controls-overlay button') ||
                e.target.closest('.nav-item') ||
                e.target.closest('.sidebar-footer') ||
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'BUTTON' ||
                e.target.closest('.logo')) { // Logo 也可以拖拽，但如果这里被过滤了就不行
                // 如果点击的是交互元素，不处理
                return;
            }

            // 左键拖拽
            if (e.button === 0 && window.pywebview) {
                // 重要：如果移除了 CSS app-region: drag，这里必须主动调用
                window.pywebview.api.drag_window();
                e.preventDefault(); // 防止可能的副作用
            }
        });
    });

    // --- API 交互 (适配 pywebview) ---
    // 从后端加载设置到 localStorage
    async function loadSettingsFromFile() {
        if (!window.pywebview) {
            setTimeout(loadSettingsFromFile, 500);
            return;
        }
        try {
            const settings = await window.pywebview.api.get_settings();
            if (settings && Object.keys(settings).length > 0) {
                // 将所有设置加载到 localStorage
                Object.keys(settings).forEach(key => {
                    if (settings[key] !== null && settings[key] !== undefined) {
                        localStorage.setItem(key, settings[key].toString());
                    }
                });
                console.log('设置已从文件加载');

                // 应用防止截图设置（无论开启还是关闭都要明确设置）
                const preventScreenshot = settings.preventScreenshot === 'true' || settings.preventScreenshot === true;
                const settingPreventScreenshotEl = document.getElementById('setting-prevent-screenshot');
                if (settingPreventScreenshotEl) {
                    settingPreventScreenshotEl.checked = preventScreenshot;
                }
                if (window.pywebview && window.pywebview.api) {
                    try {
                        await window.pywebview.api.set_prevent_screenshot(preventScreenshot);
                    } catch (e) {
                        console.error('应用防止截图设置失败:', e);
                    }
                }

                // 应用主题设置
                let savedTheme = settings.theme || localStorage.getItem('theme') || 'solid-dark';
                // 兼容旧版本：将旧的 theme 和 appearanceMode 组合转换为新格式
                if (savedTheme === 'solid' || savedTheme === 'acrylic') {
                    const savedMode = settings.appearanceMode || settings.appMode || localStorage.getItem('appearanceMode') || localStorage.getItem('appMode') || 'dark';
                    if (savedTheme === 'solid') {
                        savedTheme = savedMode === 'light' ? 'solid-light' : 'solid-dark';
                    } else {
                        savedTheme = 'acrylic-dark'; // 只保留毛玻璃暗色
                    }
                    localStorage.setItem('theme', savedTheme);
                }
                
                const themeSelectEl = document.getElementById('theme-select');
                if (themeSelectEl) {
                    themeSelectEl.value = savedTheme;
                }
                if (typeof applyTheme === 'function') {
                    applyTheme(savedTheme);
                }
                if (typeof syncTitleBar === 'function') {
                    syncTitleBar();
                }

                // 应用密码保护开关状态
                const isLocked = settings.isLocked === 'true' || settings.isLocked === true;
                const settingLockAppEl = document.getElementById('setting-lock-app');
                if (settingLockAppEl) {
                    settingLockAppEl.checked = isLocked;
                }

                // 应用主题色设置
                const savedThemeColor = settings.themeColor || localStorage.getItem('themeColor') || 'purple';
                if (typeof applyThemeColor === 'function') {
                    applyThemeColor(savedThemeColor);
                }
                const settingThemeColorEl = document.getElementById('setting-theme-color');
                if (settingThemeColorEl) {
                    settingThemeColorEl.value = savedThemeColor;
                }

                // 应用自动锁定时间设置
                const savedAutoLockTime = settings.autoLockTime || localStorage.getItem('autoLockTime') || '0';
                const settingAutoLockTimeEl = document.getElementById('setting-auto-lock-time');
                if (settingAutoLockTimeEl) {
                    settingAutoLockTimeEl.value = savedAutoLockTime;
                }
            }
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    }

    // 保存设置到文件（自动保存）
    async function saveSettingToFile(key, value) {
        if (!window.pywebview) return;
        try {
            await window.pywebview.api.update_setting(key, value);
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    }

    // 批量保存设置到文件
    async function saveSettingsToFile(settings) {
        if (!window.pywebview) return;
        try {
            await window.pywebview.api.save_settings(settings);
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    }

    async function fetchServers() {
        if (!window.pywebview) {
            console.warn('pywebview not loaded yet, retrying...');
            setTimeout(fetchServers, 500);
            return;
        }
        try {
            // 首先加载设置
            await loadSettingsFromFile();

            servers = await window.pywebview.api.get_servers();
            renderServers(); // 首次加载时直接渲染，不使用防抖

            // 自动连接所有服务器以获取实时数据（不立即设置状态，避免闪烁）
            servers.forEach((server, index) => {
                // 确保服务器状态有效，默认为 offline
                if (!server.status || (server.status !== 'online' && server.status !== 'offline' && server.status !== 'error' && server.status !== 'connecting')) {
                    server.status = 'offline';
                }
                
                // 延迟连接，避免同时连接太多服务器
                setTimeout(() => {
                    // 设置连接中状态，显示加载动画（只有offline状态才尝试连接）
                    if (server.status === 'offline') {
                        server.status = 'connecting';
                        debouncedRenderServers(); // 显示连接中状态
                    }
                    // 尝试连接
                    if (window.pywebview) {
                        window.pywebview.api.ssh_connect(server.id);

                        // 连接后等待几秒再获取数据
                        setTimeout(async () => {
                            // 检查连接是否成功（通过获取统计数据来判断）
                            const realStats = await apiGetRealStats(server.id);
                            const serverObj = servers.find(s => s.id === server.id);
                            if (realStats && serverObj) {
                                // 连接成功，更新状态和数据
                                serverObj.status = 'online';
                                serverObj.cpu = realStats.cpu;
                                serverObj.mem = realStats.mem;
                                serverObj.disk = realStats.disk;
                                if (realStats.cpu_cores !== undefined) serverObj.cpu_cores = realStats.cpu_cores;
                                if (realStats.cpu_used_cores !== undefined) serverObj.cpu_used_cores = realStats.cpu_used_cores;
                                if (realStats.mem_total_mb !== undefined) serverObj.mem_total_mb = realStats.mem_total_mb;
                                if (realStats.mem_used_mb !== undefined) serverObj.mem_used_mb = realStats.mem_used_mb;
                                if (realStats.disk_total_gb !== undefined) serverObj.disk_total_gb = realStats.disk_total_gb;
                                if (realStats.disk_used_gb !== undefined) serverObj.disk_used_gb = realStats.disk_used_gb;
                                if (realStats.net_rx_speed_kb !== undefined) serverObj.net_rx_speed_kb = realStats.net_rx_speed_kb;
                                if (realStats.net_tx_speed_kb !== undefined) serverObj.net_tx_speed_kb = realStats.net_tx_speed_kb;
                                debouncedRenderServers(); // 使用防抖渲染，避免跳动
                            } else if (serverObj && serverObj.status === 'connecting') {
                                // 如果获取失败且状态是connecting，说明连接失败，设置为offline
                                serverObj.status = 'offline';
                                debouncedRenderServers();
                            }
                            // 如果获取失败，状态保持为offline或error（由连接错误事件处理）
                        }, 4000); // 等待4秒让连接建立
                    }
                }, index * 600); // 每个服务器间隔600ms连接
            });
        } catch (e) {
            console.error('Failed to fetch servers', e);
        }
    }

    // 监听系统检测完成事件，自动更新服务器列表
    // 监听SSH连接错误事件
    window.addEventListener('ssh_connection_error', (e) => {
        const { id, message } = e.detail;
        const server = servers.find(s => s.id === id);
        if (server) {
            // 连接失败时，如果之前是connecting或online，设置为error；否则保持offline
            if (server.status === 'connecting' || server.status === 'online') {
                server.status = 'error';
            } else if (!server.status || server.status === 'offline') {
                server.status = 'offline';
            }
            debouncedRenderServers(); // 使用防抖渲染，避免跳动
            // 静默处理自动连接失败，不显示toast（避免太多提示）
            // 只在用户主动连接失败时显示提示
            // showToast(`连接失败: ${message}`, 'error');
        }
    });

    // 全局监听SSH输出事件，用于检测连接成功（用于自动连接场景）
    let connectionCheckMap = new Map(); // 记录哪些服务器正在检查连接状态
    window.addEventListener('ssh_output', (e) => {
        const { id } = e.detail;
        const server = servers.find(s => s.id === id);
        // 如果服务器状态是connecting，说明可能是刚连接成功
        if (server && server.status === 'connecting') {
            // 标记为正在检查，避免重复处理
            if (!connectionCheckMap.has(id)) {
                connectionCheckMap.set(id, true);
                // 延迟一点更新状态，确保连接稳定
                setTimeout(async () => {
                    // 通过获取统计数据来确认连接是否真的成功
                    const realStats = await apiGetRealStats(id);
                    if (realStats && server.status !== 'error') {
                        server.status = 'online';
                        debouncedRenderServers(); // 使用防抖渲染，避免跳动
                        // 更新统计数据
                        setTimeout(async () => {
                            const updatedStats = await apiGetRealStats(id);
                            if (updatedStats) {
                                server.cpu = updatedStats.cpu;
                                server.mem = updatedStats.mem;
                                server.disk = updatedStats.disk;
                                if (updatedStats.cpu_cores !== undefined) server.cpu_cores = updatedStats.cpu_cores;
                                if (updatedStats.cpu_used_cores !== undefined) server.cpu_used_cores = updatedStats.cpu_used_cores;
                                if (updatedStats.mem_total_mb !== undefined) server.mem_total_mb = updatedStats.mem_total_mb;
                                if (updatedStats.mem_used_mb !== undefined) server.mem_used_mb = updatedStats.mem_used_mb;
                                if (updatedStats.disk_total_gb !== undefined) server.disk_total_gb = updatedStats.disk_total_gb;
                                if (updatedStats.disk_used_gb !== undefined) server.disk_used_gb = updatedStats.disk_used_gb;
                                if (updatedStats.net_rx_speed_kb !== undefined) server.net_rx_speed_kb = updatedStats.net_rx_speed_kb;
                                if (updatedStats.net_tx_speed_kb !== undefined) server.net_tx_speed_kb = updatedStats.net_tx_speed_kb;
                                debouncedRenderServers(); // 使用防抖渲染，避免跳动
                            }
                        }, 2000);
                    } else if (server.status === 'connecting') {
                        // 如果获取统计数据失败且状态是connecting，说明连接失败，设置为offline
                        server.status = 'offline';
                        debouncedRenderServers();
                    }
                    connectionCheckMap.delete(id);
                }, 500);
            }
        }
    });

    window.addEventListener('server_os_detected', async (e) => {
        const { id, os } = e.detail;
        // 更新本地服务器数据
        const server = servers.find(s => s.id === id);
        if (server) {
            server.os = os;
            // 重新渲染服务器列表以更新图标
            debouncedRenderServers(); // 使用防抖渲染，避免跳动
        }
    });

    async function apiSaveServer(data) {
        try {
            return await window.pywebview.api.save_server(data);
        } catch (e) { console.error(e); }
    }

    async function apiUpdateServer(id, data) {
        try {
            await window.pywebview.api.update_server(id, data);
        } catch (e) { console.error(e); }
    }

    async function apiDeleteServer(id) {
        try {
            await window.pywebview.api.delete_server(id);
        } catch (e) { console.error(e); }
    }

    async function apiTestConnection(data) {
        try {
            return await window.pywebview.api.test_connection(data);
        } catch (e) {
            return { success: false, message: e.toString() };
        }
    }

    async function apiSftpList(id, path = '.') {
        try {
            return await window.pywebview.api.sftp_list(id, path);
        } catch (e) { console.error(e); return { success: false, message: e.toString() }; }
    }

    async function apiSftpDownload(id, remotePath) {
        try {
            const res = await window.pywebview.api.download_file_dialog(id, remotePath);
            if (res.success) showToast('下载成功');
            else if (res.message !== 'Cancelled') alert('下载失败: ' + res.message);
        } catch (e) { console.error(e); }
    }

    async function apiSftpUpload(id, remotePath) {
        try {
            const res = await window.pywebview.api.upload_file_dialog(id, remotePath);
            if (res.success) {
                showToast('上传成功');
                loadSftp(id, remotePath); // Refresh
            }
            else if (res.message !== 'Cancelled') alert('上传失败: ' + res.message);
        } catch (e) { console.error(e); }
    }

    async function apiSftpDelete(id, path, isDir) {
        try {
            if (confirm(`确定删除 ${isDir ? '文件夹' : '文件'} "${path}" 吗？`)) {
                const res = await window.pywebview.api.sftp_delete(id, path, isDir);
                if (res.success) {
                    showToast('已删除');
                    // Refresh parent dir
                    const parent = path.substring(0, path.lastIndexOf('/')) || '/';
                    loadSftp(id, parent);
                } else {
                    alert('删除失败: ' + res.message);
                }
            }
        } catch (e) { console.error(e); }
    }

    async function apiSftpRead(id, path) {
        try {
            return await window.pywebview.api.sftp_read_text(id, path);
        } catch (e) {
            return { success: false, message: e.toString() };
        }
    }

    async function apiSftpSave(id, path, content) {
        try {
            return await window.pywebview.api.sftp_write_text(id, path, content);
        } catch (e) {
            return { success: false, message: e.toString() };
        }
    }

    async function apiGetRealStats(id) {
        try {
            return await window.pywebview.api.get_server_real_stats(id);
        } catch (e) { return null; }
    }

    // --- Sidebar Stats & Files Logic ---
    const sidebarStats = document.getElementById('sidebar-stats');
    const sidebarFiles = document.getElementById('sidebar-files');
    const sftpPath = document.getElementById('sftp-path');
    const sftpList = document.getElementById('sftp-list');
    const btnSftpHome = document.getElementById('btn-sftp-home');
    const btnSftpRefresh = document.getElementById('btn-sftp-refresh');

    let currentSftpPath = '.';
    let currentSftpServerId = null;

    // SFTP Path Input Logic
    const sftpPathInput = document.getElementById('sftp-path-input');
    if (sftpPathInput) {
        sftpPathInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const path = sftpPathInput.value.trim();
                if (path && currentSftpServerId) {
                    loadSftp(currentSftpServerId, path);
                }
            }
        });
    }

    async function loadSftp(serverId, path = '/', retryCount = 0) {
        if (!sftpList) return;
        // 仅在首次或手动刷新时显示加载动画，重试时不显示以避免闪烁
        if (retryCount === 0) sftpList.innerHTML = '<div class="sftp-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> 加载中...</div>';

        const res = await apiSftpList(serverId, path);
        if (res.success) {
            currentSftpPath = res.path;
            currentSftpServerId = serverId;
            renderSftpList(res.files);
            if (sftpPathInput) {
                sftpPathInput.value = res.path;
                sftpPathInput.title = res.path;
            }
        } else {
            // 自动重试逻辑：如果显示未连接，说明 SSH 通道还没建立好，等待一下
            if (res.message === 'Not connected' && retryCount < 10) {
                sftpList.innerHTML = '<div class="sftp-loading"><i class="fa-solid fa-ethernet"></i> 建立通道中...</div>';
                setTimeout(() => loadSftp(serverId, path, retryCount + 1), 1000);
            } else {
                sftpList.innerHTML = `<div class="sftp-error">加载失败: ${res.message}</div>`;
            }
        }
    }

    function renderSftpList(files) {
        if (!sftpList) return;
        sftpList.innerHTML = '';

        if (currentSftpPath !== '/' && currentSftpPath !== '/root') { // Simple check, backend handles '..' better usually
            const backItem = document.createElement('div');
            backItem.className = 'sftp-item';
            backItem.innerHTML = `
                <div class="sftp-icon"><i class="fa-solid fa-turn-up" style="color:var(--text-muted)"></i></div>
                <div class="sftp-details"><div class="sftp-name">..</div></div>
             `;
            backItem.addEventListener('click', () => {
                // Simple parent dir logic
                const parts = currentSftpPath.split('/').filter(p => p);
                parts.pop();
                const parent = '/' + parts.join('/');
                loadSftp(currentSftpServerId, parent || '/');
            });
            sftpList.appendChild(backItem);
        }

        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'sftp-item';
            const iconClass = file.is_dir ? 'fa-solid fa-folder' : 'fa-regular fa-file';
            const iconColor = file.is_dir ? '#e5c07b' : 'var(--text-secondary)'; // Folder color

            const sizeHtml = file.is_dir ? '' : `<div class="sftp-size">${formatBytes(file.size)}</div>`;
            item.innerHTML = `
                <div class="sftp-icon"><i class="${iconClass}" style="color:${iconColor}"></i></div>
                <div class="sftp-details">
                    <div class="sftp-name" title="${file.name}">${file.name}</div>
                    ${sizeHtml}
                </div>
            `;

            // Right Click Menu for SFTP
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Show custom context menu for files
                const fullPath = currentSftpPath === '/' ? `/${file.name}` : `${currentSftpPath}/${file.name}`;

                // Reuse or create a mini menu. For simplicity, let's use confirm dialogs for now or reuse the main ctx menu structure?
                // Let's build a quick custom menu for this.
                // Remove existing
                document.querySelectorAll('.context-menu').forEach(el => el.remove());

                const menu = document.createElement('div');
                menu.className = 'context-menu';
                const x = Math.min(e.clientX, window.innerWidth - 180);
                const y = Math.min(e.clientY, window.innerHeight - 100);
                menu.style.left = `${x}px`;
                menu.style.top = `${y}px`;

                menu.innerHTML = `
                    ${!file.is_dir ? '<div class="menu-item" id="sftp-ctx-edit"><i class="fa-solid fa-pen-to-square"></i> 编辑</div>' : ''}
                    <div class="menu-item" id="sftp-ctx-del"><i class="fa-solid fa-trash"></i> 删除</div>
                    ${!file.is_dir ? '<div class="menu-item" id="sftp-ctx-down"><i class="fa-solid fa-download"></i> 下载</div>' : ''}
                `;
                document.body.appendChild(menu);

                const closeMenu = () => menu.remove();
                document.addEventListener('click', closeMenu, { once: true });

                if (!file.is_dir) {
                    menu.querySelector('#sftp-ctx-edit').onclick = () => openEditor(currentSftpServerId, fullPath, file.name);
                    menu.querySelector('#sftp-ctx-down').onclick = () => apiSftpDownload(currentSftpServerId, fullPath);
                }
                menu.querySelector('#sftp-ctx-del').onclick = () => apiSftpDelete(currentSftpServerId, fullPath, file.is_dir).then(() => loadSftp(currentSftpServerId, currentSftpPath));
            });

            if (file.is_dir) {
                item.addEventListener('click', () => loadSftp(currentSftpServerId, `${currentSftpPath === '/' ? '' : currentSftpPath}/${file.name}`));
            } else {
                // Double click to show Actions
                item.addEventListener('dblclick', () => showFileActions(
                    currentSftpServerId,
                    `${currentSftpPath === '/' ? '' : currentSftpPath}/${file.name}`,
                    file.name,
                    false,
                    () => loadSftp(currentSftpServerId, currentSftpPath)
                ));
            }
            sftpList.appendChild(item);
        });
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function formatSpeed(kbPerSec) {
        if (kbPerSec < 0) kbPerSec = 0;
        if (kbPerSec < 1024) {
            return `${kbPerSec.toFixed(1)} KB/s`;
        } else if (kbPerSec < 1024 * 1024) {
            return `${(kbPerSec / 1024).toFixed(2)} MB/s`;
        } else {
            return `${(kbPerSec / (1024 * 1024)).toFixed(2)} GB/s`;
        }
    }

    // Bind SFTP Buttons
    if (btnSftpHome) btnSftpHome.addEventListener('click', () => {
        if (currentSftpServerId) loadSftp(currentSftpServerId, '.');
    });
    if (btnSftpRefresh) btnSftpRefresh.addEventListener('click', () => {
        if (currentSftpServerId) loadSftp(currentSftpServerId, currentSftpPath);
    });

    const sbCpuVal = document.getElementById('sb-cpu-val');
    const sbCpuBar = document.getElementById('sb-cpu-bar');
    const sbMemVal = document.getElementById('sb-mem-val');
    const sbMemBar = document.getElementById('sb-mem-bar');
    const sbDiskVal = document.getElementById('sb-disk-val');
    const sbDiskBar = document.getElementById('sb-disk-bar');
    const sbUptime = document.getElementById('sb-uptime');

    // Sidebar Info Elements
    const sidebarInfo = document.getElementById('sidebar-info');
    const sbInfoName = document.getElementById('sb-info-name');
    // const sbInfoHost = document.getElementById('sb-info-host'); // Removed
    const sbInfoIp = document.getElementById('sb-info-ip');
    // const sbInfoUser = document.getElementById('sb-info-user'); // Removed from UI but kept var if needed
    const sbInfoOs = document.getElementById('sb-info-os');

    // Bind Copy IP Event for Sidebar Info
    if (sbInfoIp) {
        sbInfoIp.addEventListener('click', () => {
            const ip = sbInfoIp.innerText;
            if (ip && ip !== '--') {
                navigator.clipboard.writeText(ip);
                showToast('IP 已复制');
            }
        });
    }

    function updateSidebarInfo(server) {
        if (!sidebarInfo || !server) return;

        if (sbInfoName) sbInfoName.innerText = server.name || server.host;
        // if (sbInfoHost) sbInfoHost.innerText = server.host;
        if (sbInfoIp) sbInfoIp.innerText = server.host; // Usually IP is host
        // if (sbInfoUser) sbInfoUser.innerText = server.user;

        if (sbInfoOs) {
            let osName = 'Linux';
            // Try to be more specific if possible, map common IDs to display names
            const osMap = {
                'ubuntu': 'Ubuntu',
                'centos': 'CentOS',
                'debian': 'Debian',
                'fedora': 'Fedora',
                'alpine': 'Alpine Linux',
                'arch': 'Arch Linux',
                'opensuse': 'openSUSE',
                'redhat': 'Red Hat',
                'rocky': 'Rocky Linux',
                'almalinux': 'AlmaLinux'
            };

            // Check if server.os is in our map
            if (server.os && osMap[server.os.toLowerCase()]) {
                osName = osMap[server.os.toLowerCase()];
            } else if (server.os) {
                // Capitalize first letter if unknown
                osName = server.os.charAt(0).toUpperCase() + server.os.slice(1);
            }
            sbInfoOs.innerText = osName;
        }
    }

    function updateSidebarStats(server) {
        if (!server || !sidebarStats) return;

        // Update values
        if (sbCpuVal) sbCpuVal.innerText = (server.cpu || 0) + '%';
        if (sbCpuBar) sbCpuBar.style.width = (server.cpu || 0) + '%';

        if (sbMemVal) sbMemVal.innerText = (server.mem || 0) + '%';
        if (sbMemBar) sbMemBar.style.width = (server.mem || 0) + '%';

        if (sbDiskVal) sbDiskVal.innerText = (server.disk || 0) + '%';
        if (sbDiskBar) sbDiskBar.style.width = (server.disk || 0) + '%';

        // 已隐藏运行中文字，不再更新
        // if (sbUptime) sbUptime.innerText = '运行中';
    }

    // Modify TabManager to handle sidebar visibility
    // --- Tab Manager (SSH 集成 Xterm.js) ---
    class TabManager {
        constructor() {
            this.tabs = new Map();
            this.activeTabId = 'dashboard';
            this.sidebarFooter = document.querySelector('.sidebar-footer'); // Get footer ref
            this.initDragDrop();
        }

        initDragDrop() {
            // Simple drag and drop using native HTML5 API
            // We attach event listeners to the container but manage items
            const container = document.getElementById('tab-group');
            let draggedItem = null;

            container.addEventListener('dragstart', (e) => {
                const item = e.target.closest('.tab-item');
                if (!item) return;
                // Don't drag the "add" button or special tabs if needed
                if (item.id === 'tab-dashboard') {
                    e.preventDefault(); // Lock dashboard? Usually pinned.
                    return;
                }

                draggedItem = item;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.tab);
                item.style.opacity = '0.5';
            });

            container.addEventListener('dragend', (e) => {
                if (draggedItem) {
                    draggedItem.style.opacity = '';
                    draggedItem = null;
                }
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault(); // Necessary to allow dropping
                e.dataTransfer.dropEffect = 'move';

                const targetItem = e.target.closest('.tab-item');
                if (!targetItem || targetItem === draggedItem) return;
                if (targetItem.id === 'tab-dashboard') return; // Don't swap with dashboard

                // Calculate position
                const rect = targetItem.getBoundingClientRect();
                const next = (e.clientX - rect.left) > (rect.width / 2);

                // DOM manipulation
                if (next) {
                    container.insertBefore(draggedItem, targetItem.nextSibling);
                } else {
                    container.insertBefore(draggedItem, targetItem);
                }

                // Keep the "Add" button always at the end
                const addBtn = document.getElementById('tab-add-btn');
                if (addBtn && container.lastElementChild !== addBtn) {
                    container.appendChild(addBtn);
                }
            });
        }

        activate(id) {
            if (this.activeTabId === id) return;

            // 先确定所有显示状态，避免中间状态导致的闪烁
            const sidebarStats = document.getElementById('sidebar-stats');
            const sidebarFiles = document.getElementById('sidebar-files');
            const sidebarInfo = document.getElementById('sidebar-info');

            // Determine Sidebar Visibility based on Tab Type (先计算状态)
            let showStats = false;
            let showFiles = false;
            let showInfo = false;
            let showFooter = false;

            // 只在 SSH 会话时显示侧边栏内容
            if (id.startsWith('session-')) {
                showStats = true;
                showFiles = true;
                showInfo = true;
            } else if (id === 'dashboard') {
                showFooter = true;
            }

            const oldTab = document.querySelector(`.tab-item[data-tab="${this.activeTabId}"]`);
            const newTab = document.querySelector(`.tab-item[data-tab="${id}"]`);

            if (oldTab) oldTab.classList.remove('active');
            if (newTab) {
                newTab.classList.add('active');
                newTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }

            // 同步切换，避免闪烁 - 先显示目标容器，再隐藏其他容器
            if (id === 'dashboard') {
                dashboardContainer.classList.remove('hidden');
                if (noticeContainer) noticeContainer.classList.add('hidden');
                settingsContainer.classList.add('hidden');
                terminalsContainer.classList.add('hidden');
            } else if (id === 'settings') {
                settingsContainer.classList.remove('hidden');
                dashboardContainer.classList.add('hidden');
                if (noticeContainer) noticeContainer.classList.add('hidden');
                terminalsContainer.classList.add('hidden');
            } else if (id === 'notice') {
                if (noticeContainer) noticeContainer.classList.remove('hidden');
                dashboardContainer.classList.add('hidden');
                settingsContainer.classList.add('hidden');
                terminalsContainer.classList.add('hidden');
            } else {
                // Show terminals container for both terminal and sftp
                terminalsContainer.classList.remove('hidden');
                dashboardContainer.classList.add('hidden');
                if (noticeContainer) noticeContainer.classList.add('hidden');
                settingsContainer.classList.add('hidden');
                
                // Hide all instances first
                Array.from(terminalsContainer.children).forEach(el => el.classList.add('hidden'));

                const session = this.tabs.get(id);
                if (session && session.contentEl) {
                    session.contentEl.classList.remove('hidden');
                    // If it's a terminal, refit and focus
                    if (session.instance && session.instance.term) {
                        setTimeout(() => {
                            if (session.instance.fitAddon) session.instance.fitAddon.fit();
                            session.instance.focus();
                        }, 50); // 减少延迟
                    }
                    // If it's a file manager, ensure it's visible
                    if (session.instance && session.instance.loadPath) {
                        // FileManager instance - ensure it's properly displayed
                        session.contentEl.style.display = 'flex';
                    }
                }
            }

            // Apply Sidebar Visibility (在容器切换之后)
            if (sidebarStats) sidebarStats.classList.toggle('hidden', !showStats);
            if (sidebarFiles) sidebarFiles.classList.toggle('hidden', !showFiles);
            if (sidebarInfo) sidebarInfo.classList.toggle('hidden', !showInfo);

            if (this.sidebarFooter) {
                this.sidebarFooter.classList.toggle('hidden', !showFooter);
            }

            // 处理SSH会话
            if (id.startsWith('session-')) {
                // Trigger immediate update
                const serverId = parseInt(id.replace('session-', ''));
                const session = this.tabs.get(id);
                const server = session ? session.instance.server : servers.find(s => s.id === serverId);
                if (server) {
                    updateSidebarStats(server);
                    updateSidebarInfo(server); // Update Info
                    // Load SFTP only if not loaded or changed
                    if (currentSftpServerId !== serverId) loadSftp(serverId);
                }
            } else if (id.startsWith('sftp-')) {
                // 处理SFTP文件管理 - 隐藏侧边栏内容
                if (sidebarStats) sidebarStats.classList.add('hidden');
                if (sidebarFiles) sidebarFiles.classList.add('hidden');
                if (sidebarInfo) sidebarInfo.classList.add('hidden');
            }
            
            this.activeTabId = id;
        }

        openNotice() {
            const id = 'notice';
            let tabEl = document.querySelector(`.tab-item[data-tab="${id}"]`);

            if (!tabEl) {
                // Create Notice Tab
                tabEl = document.createElement('div');
                tabEl.className = 'tab-item';
                tabEl.dataset.tab = id;
                tabEl.draggable = true;
                tabEl.innerHTML = `
                    <i class="fa-solid fa-bullhorn" style="margin-right:6px; font-size:0.7rem;"></i> 
                    <span class="tab-title">公告</span>
                    <span class="tab-close"><i class="fa-solid fa-xmark"></i></span>
                `;

                // Bind events
                tabEl.addEventListener('click', (e) => {
                    if (e.target.closest('.tab-close')) {
                        e.stopPropagation();
                        this.close(id);
                    } else {
                        this.activate(id);
                    }
                });

                tabEl.addEventListener('mouseup', (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        this.close(id);
                    }
                });

                if (tabGroup) {
                    const addBtn = document.getElementById('tab-add-btn');
                    if (addBtn) tabGroup.insertBefore(tabEl, addBtn);
                    else tabGroup.appendChild(tabEl);
                }
            }

            this.activate(id);
        }

        openAiChat() {
            const id = 'ai-chat';
            let tabEl = document.querySelector(`.tab-item[data-tab="${id}"]`);

            if (!tabEl) {
                tabEl = document.createElement('div');
                tabEl.className = 'tab-item';
                tabEl.dataset.tab = id;
                tabEl.draggable = true; // Enable dragging
                tabEl.innerHTML = `
                    <i class="fa-solid fa-robot" style="margin-right:6px; font-size:0.7rem;"></i> 
                    <span class="tab-title">AI 助手</span>
                    <span class="tab-close"><i class="fa-solid fa-xmark"></i></span>
                `;

                tabEl.addEventListener('click', (e) => {
                    if (e.target.closest('.tab-close')) {
                        e.stopPropagation();
                        this.close(id);
                    } else {
                        this.activate(id);
                    }
                });

                tabEl.addEventListener('mouseup', (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        this.close(id);
                    }
                });

                if (tabGroup) {
                    const addBtn = document.getElementById('tab-add-btn');
                    if (addBtn) tabGroup.insertBefore(tabEl, addBtn);
                    else tabGroup.appendChild(tabEl);
                }
            }
            this.activate(id);
        }

        openSettings() {
            const id = 'settings';
            // If tab already exists (visually), just activate it. 
            // Note: In our HTML, we don't have a static settings tab, we need to create it if it doesn't exist in the tab bar?
            // Actually, for simplicity, let's treat Settings as a special dynamic tab that we create if not present.

            let tabEl = document.querySelector(`.tab-item[data-tab="${id}"]`);

            if (!tabEl) {
                // Create Settings Tab
                tabEl = document.createElement('div');
                tabEl.className = 'tab-item';
                tabEl.dataset.tab = id;
                tabEl.draggable = true; // Enable dragging
                tabEl.innerHTML = `
                    <i class="fa-solid fa-gear" style="margin-right:6px; font-size:0.7rem;"></i> 
                    <span class="tab-title">设置</span>
                    <span class="tab-close"><i class="fa-solid fa-xmark"></i></span>
                `;

                // Bind events
                tabEl.addEventListener('click', (e) => {
                    if (e.target.closest('.tab-close')) {
                        e.stopPropagation();
                        this.close(id);
                    } else {
                        this.activate(id);
                    }
                });

                tabEl.addEventListener('mouseup', (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        this.close(id);
                    }
                });

                if (tabGroup) {
                    const addBtn = document.getElementById('tab-add-btn');
                    if (addBtn) tabGroup.insertBefore(tabEl, addBtn);
                    else tabGroup.appendChild(tabEl);
                }
            }

            this.activate(id);
        }

        openSession(server) {
            const id = `session-${server.id}`;
            if (this.tabs.has(id)) {
                this.activate(id);
                return;
            }

            const tabEl = document.createElement('div');
            tabEl.className = 'tab-item';
            tabEl.dataset.tab = id;
            tabEl.draggable = true; // Enable dragging
            tabEl.innerHTML = `
                <i class="fa-solid fa-terminal" style="margin-right:6px; font-size:0.7rem;"></i> 
                <span class="tab-title">${server.name}</span>
                <span class="tab-close"><i class="fa-solid fa-xmark"></i></span>
            `;

            tabEl.addEventListener('click', (e) => {
                if (e.target.closest('.tab-close')) {
                    e.stopPropagation();
                    this.close(id);
                } else {
                    this.activate(id);
                }
            });

            // 中键关闭
            tabEl.addEventListener('mouseup', (e) => {
                if (e.button === 1) { // Middle click
                    e.preventDefault();
                    this.close(id);
                }
            });

            if (tabGroup) {
                const addBtn = document.getElementById('tab-add-btn');
                if (addBtn) {
                    tabGroup.insertBefore(tabEl, addBtn);
                } else {
                    tabGroup.appendChild(tabEl);
                }
            }

            const contentEl = document.createElement('div');
            contentEl.className = 'terminal-instance hidden';
            contentEl.id = `term-${id}`;
            // 移除强制 padding: 0，让 CSS (.terminal-instance) 的 padding 生效以增加左侧间距
            // contentEl.style.padding = '0'; 
            contentEl.style.backgroundColor = 'transparent'; /* 移除硬编码的背景色，让其透明以使用 CSS 变量 */

            if (terminalsContainer) terminalsContainer.appendChild(contentEl);

            // 初始化 Xterm.js 客户端
            const terminalInstance = new SSHClient(contentEl, server);

            // 设置连接中状态，显示加载动画
            const serverObj = servers.find(s => s.id === server.id);
            if (serverObj && serverObj.status !== 'error' && serverObj.status !== 'online') {
                serverObj.status = 'connecting';
                debouncedRenderServers(); // 显示连接中状态
            }

            // 不要立即设置状态为online，等待连接成功
            // 连接成功会通过ssh_output事件触发，连接失败会通过ssh_connection_error事件触发
            if (serverObj && serverObj.status !== 'error') {
                // 只有在不是错误状态时才尝试连接，避免重复连接
                // 连接状态由后端事件通知
                // 等待连接建立后再获取统计数据
                setTimeout(async () => {
                    // 检查连接是否成功（通过检查状态）
                    if (serverObj.status === 'online') {
                        const realStats = await apiGetRealStats(server.id);
                        if (realStats) {
                            serverObj.cpu = realStats.cpu;
                            serverObj.mem = realStats.mem;
                            serverObj.disk = realStats.disk;
                            if (realStats.cpu_cores !== undefined) serverObj.cpu_cores = realStats.cpu_cores;
                            if (realStats.cpu_used_cores !== undefined) serverObj.cpu_used_cores = realStats.cpu_used_cores;
                            if (realStats.mem_total_mb !== undefined) serverObj.mem_total_mb = realStats.mem_total_mb;
                            if (realStats.mem_used_mb !== undefined) serverObj.mem_used_mb = realStats.mem_used_mb;
                            if (realStats.disk_total_gb !== undefined) serverObj.disk_total_gb = realStats.disk_total_gb;
                            if (realStats.disk_used_gb !== undefined) serverObj.disk_used_gb = realStats.disk_used_gb;
                            if (realStats.net_rx_speed_kb !== undefined) serverObj.net_rx_speed_kb = realStats.net_rx_speed_kb;
                            if (realStats.net_tx_speed_kb !== undefined) serverObj.net_tx_speed_kb = realStats.net_tx_speed_kb;
                            debouncedRenderServers(); // 使用防抖渲染，避免跳动
                        }
                    }
                }, 3000); // Wait 3 seconds for connection to fully establish
            }

            this.tabs.set(id, { tabEl, contentEl, instance: terminalInstance });
            this.activate(id);
        }

        openSftp(server) {
            const id = `sftp-${server.id}`;
            if (this.tabs.has(id)) {
                this.activate(id);
                return;
            }

            const tabEl = document.createElement('div');
            tabEl.className = 'tab-item';
            tabEl.dataset.tab = id;
            tabEl.draggable = true;
            tabEl.innerHTML = `
                <i class="fa-regular fa-folder-open" style="margin-right:6px; font-size:0.7rem; color:#eab308;"></i> 
                <span class="tab-title">${server.name} (SFTP)</span>
                <span class="tab-close"><i class="fa-solid fa-xmark"></i></span>
            `;

            tabEl.addEventListener('click', (e) => {
                if (e.target.closest('.tab-close')) {
                    e.stopPropagation();
                    this.close(id);
                } else {
                    this.activate(id);
                }
            });

            tabEl.addEventListener('mouseup', (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    this.close(id);
                }
            });

            if (tabGroup) {
                const addBtn = document.getElementById('tab-add-btn');
                if (addBtn) tabGroup.insertBefore(tabEl, addBtn);
                else tabGroup.appendChild(tabEl);
            }

            const contentEl = document.createElement('div');
            contentEl.className = 'sftp-instance hidden';
            contentEl.id = `sftp-view-${id}`;
            // Fill parent
            contentEl.style.width = '100%';
            contentEl.style.height = '100%';
            contentEl.style.display = 'flex';
            contentEl.style.flexDirection = 'column';
            contentEl.style.padding = '20px';
            contentEl.style.backgroundColor = 'transparent';

            if (terminalsContainer) terminalsContainer.appendChild(contentEl);

            // Initialize SFTP Manager
            const sftpInstance = new FileManager(contentEl, server);

            // Ensure SSH connection is established for SFTP
            window.pywebview.api.ssh_connect(server.id);

            // 打开SFTP时，检查连接是否真的成功
            const serverObj = servers.find(s => s.id === server.id);
            if (serverObj && serverObj.status !== 'online') {
                // 通过获取统计数据来确认连接是否成功
                setTimeout(async () => {
                    const realStats = await apiGetRealStats(server.id);
                    if (realStats && serverObj.status !== 'error') {
                        serverObj.status = 'online';
                        debouncedRenderServers();
                    }
                }, 1000);
                // Immediately fetch stats after connection
                setTimeout(async () => {
                    const realStats = await apiGetRealStats(server.id);
                    if (realStats) {
                        serverObj.cpu = realStats.cpu;
                        serverObj.mem = realStats.mem;
                        serverObj.disk = realStats.disk;
                        if (realStats.cpu_cores !== undefined) serverObj.cpu_cores = realStats.cpu_cores;
                        if (realStats.cpu_used_cores !== undefined) serverObj.cpu_used_cores = realStats.cpu_used_cores;
                        if (realStats.mem_total_mb !== undefined) serverObj.mem_total_mb = realStats.mem_total_mb;
                        if (realStats.mem_used_mb !== undefined) serverObj.mem_used_mb = realStats.mem_used_mb;
                        if (realStats.disk_total_gb !== undefined) serverObj.disk_total_gb = realStats.disk_total_gb;
                        if (realStats.disk_used_gb !== undefined) serverObj.disk_used_gb = realStats.disk_used_gb;
                        if (realStats.net_rx_speed_kb !== undefined) serverObj.net_rx_speed_kb = realStats.net_rx_speed_kb;
                        if (realStats.net_tx_speed_kb !== undefined) serverObj.net_tx_speed_kb = realStats.net_tx_speed_kb;
                        debouncedRenderServers(); // 使用防抖渲染，避免跳动 // Update display with real data
                    }
                }, 3000);
            }

            sftpInstance.loadPath('/');

            this.tabs.set(id, { tabEl, contentEl, instance: sftpInstance });
            this.activate(id);
        }

        updateTabTitle(serverId, newName) {
            const id = `session-${serverId}`;
            const session = this.tabs.get(id);
            if (session && session.tabEl) {
                const titleSpan = session.tabEl.querySelector('.tab-title');
                if (titleSpan) titleSpan.innerText = newName;
            }
        }

        close(id) {
            if (id === 'settings' || id === 'ai-chat') {
                // Close settings/ai tab
                const tabEl = document.querySelector(`.tab-item[data-tab="${id}"]`);
                if (tabEl) tabEl.remove();

                if (this.activeTabId === id) {
                    this.activate('dashboard');
                }
                return;
            }

            const session = this.tabs.get(id);
            if (!session) return;

            // 如果关闭的是当前激活的 tab，计算下一个要激活的 tab
            if (this.activeTabId === id) {
                const keys = Array.from(this.tabs.keys());
                // We also need to consider 'dashboard' and 'settings' in the order if we were fully generic, 
                // but simplified logic: default back to dashboard or next session

                // Hacky way to find next visual tab?
                // Let's just default to dashboard if it was the last session
                if (keys.length <= 1) {
                    this.activate('dashboard');
                } else {
                    const index = keys.indexOf(id);
                    let nextId = 'dashboard';
                    if (index < keys.length - 1) nextId = keys[index + 1];
                    else if (index > 0) nextId = keys[index - 1];
                    this.activate(nextId);
                }
            }

            // 关闭连接 (SSH or SFTP Cleanup if needed)
            if (session.instance && session.instance.destroy) session.instance.destroy();

            session.tabEl.remove();
            session.contentEl.remove();
            this.tabs.delete(id);
        }
    }

    // --- File Manager Class (Independent SFTP Tab) ---
    class FileManager {
        constructor(container, server) {
            this.server = server;
            this.container = container;
            this.currentPath = '/';
            this.files = [];
            this.history = [];
            this.historyIndex = -1;

            this.renderLayout();
        }

        renderLayout() {
            // Minimalist UI: Transparent background, No borders, Back/Forward buttons
            this.container.innerHTML = `
                <div class="file-manager-layout">
                    <div class="fm-toolbar">
                        <div class="fm-nav-btns">
                            <button class="btn-icon small no-bg" id="fm-back-${this.server.id}" title="后退"><i class="fa-solid fa-arrow-left"></i></button>
                            <button class="btn-icon small no-bg" id="fm-up-${this.server.id}" title="向上"><i class="fa-solid fa-arrow-up"></i></button>
                        </div>
                        <div class="fm-path-wrapper" style="flex:1; margin:0 10px;">
                            <input type="text" class="sftp-path-input" id="fm-path-input-${this.server.id}" value="/" spellcheck="false">
                        </div>
                        <div class="fm-tools">
                            <button class="btn-icon small no-bg" id="sftp-refresh-${this.server.id}" title="刷新"><i class="fa-solid fa-rotate"></i></button>
                            <button class="btn-icon small no-bg" id="sftp-upload-${this.server.id}" title="上传"><i class="fa-solid fa-upload"></i></button>
                        </div>
                    </div>
                    <div class="fm-list" id="fm-list-${this.server.id}"></div>
                </div>
            `;
            this.listEl = this.container.querySelector(`#fm-list-${this.server.id}`);
            this.pathInput = this.container.querySelector(`#fm-path-input-${this.server.id}`);

            // Bind Events
            this.container.querySelector(`#fm-back-${this.server.id}`).onclick = () => this.goBack();
            this.container.querySelector(`#fm-up-${this.server.id}`).onclick = () => this.goUp();
            this.container.querySelector(`#sftp-refresh-${this.server.id}`).onclick = () => this.loadPath(this.currentPath, 0, false);
            this.container.querySelector(`#sftp-upload-${this.server.id}`).onclick = () => apiSftpUpload(this.server.id, this.currentPath).then(() => this.loadPath(this.currentPath, 0, false));

            if (this.pathInput) {
                this.pathInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const path = this.pathInput.value.trim();
                        if (path) this.loadPath(path);
                    }
                });
            }
        }

        goUp() {
            if (this.currentPath === '/' || this.currentPath === '.') return;
            const parts = this.currentPath.split('/').filter(p => p);
            parts.pop();
            const parent = '/' + parts.join('/');
            this.loadPath(parent || '/');
        }

        goBack() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.loadPath(this.history[this.historyIndex], 0, false);
            }
        }

        goForward() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.loadPath(this.history[this.historyIndex], 0, false);
            }
        }

        updateHistoryUI() {
            this.btnBack.disabled = this.historyIndex <= 0;
            this.btnForward.disabled = this.historyIndex >= this.history.length - 1;
            this.btnBack.style.opacity = this.btnBack.disabled ? '0.3' : '1';
            this.btnForward.style.opacity = this.btnForward.disabled ? '0.3' : '1';
        }

        async loadPath(path, retryCount = 0, addToHistory = true) {
            // 记录开始时间
            if (retryCount === 0) {
                this.startTime = Date.now();
                this.listEl.innerHTML = `
                    <div class="loader-wrapper">
                        <div class="container">
                          <div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div><div class="slice"></div>
                        </div>
                    </div>
                `;
            }

            const res = await apiSftpList(this.server.id, path);

            if (res.success) {
                // 强制等待 (优化体验)
                const elapsed = Date.now() - this.startTime;
                const remaining = Math.max(0, 300 - elapsed);

                setTimeout(() => {
                    if (addToHistory) {
                        // Truncate forward history if we branch off
                        if (this.historyIndex < this.history.length - 1) {
                            this.history = this.history.slice(0, this.historyIndex + 1);
                        }
                        this.history.push(res.path);
                        this.historyIndex++;
                    }

                    // Update Path Input
                    const realPath = res.path;
                    this.currentPath = realPath;
                    if (this.pathInput) {
                        this.pathInput.value = realPath;
                        this.pathInput.title = realPath;
                    }
                    this.files = res.files;
                    this.renderFiles();
                }, remaining);
            } else {
                if (res.message === 'Not connected' && retryCount < 50) {
                    setTimeout(() => this.loadPath(path, retryCount + 1, addToHistory), 200);
                } else {
                    this.listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> 加载失败: ${res.message}</div>`;
                }
            }
        }

        renderFiles() {
            this.listEl.innerHTML = '';
            if (this.files.length === 0) {
                this.listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">空文件夹</div>';
                return;
            }

            // Switch to List Layout
            const listContainer = document.createElement('div');
            listContainer.style.display = 'flex';
            listContainer.style.flexDirection = 'column';

            this.files.forEach((file, index) => {
                const card = document.createElement('div');
                card.className = 'file-card';
                card.style.display = 'flex';
                card.style.flexDirection = 'row';
                card.style.alignItems = 'center';
                card.style.padding = '10px 16px';
                card.style.borderBottom = index === this.files.length - 1 ? 'none' : '1px solid var(--border-color)';
                card.style.cursor = 'pointer';
                // 添加流畅的进入动画
                card.style.opacity = '0';
                card.style.transform = 'translateY(10px)';
                card.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                // Rely on CSS .file-card:hover for background

                const iconClass = file.is_dir ? 'fa-folder' : 'fa-file';
                const iconColor = file.is_dir ? '#eab308' : 'var(--text-secondary)';
                const iconStyle = file.is_dir ? 'solid' : 'regular';

                card.innerHTML = `
                    <div style="font-size: 1.2rem; color: ${iconColor}; margin-right: 16px; width: 24px; text-align: center; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-${iconStyle} ${iconClass}"></i>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-primary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-ui);">
                        ${file.name}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-left: 20px; min-width: 100px; text-align: right; font-family: var(--font-mono);">
                        ${file.is_dir ? '--' : formatBytes(file.size)}
                    </div>
                `;

                // Events
                if (file.is_dir) {
                    card.onclick = () => this.loadPath(`${this.currentPath === '/' ? '' : this.currentPath}/${file.name}`);
                } else {
                    card.ondblclick = () => apiSftpDownload(this.server.id, `${this.currentPath === '/' ? '' : this.currentPath}/${file.name}`);
                }

                // Context Menu
                card.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fullPath = this.currentPath === '/' ? `/${file.name}` : `${this.currentPath}/${file.name}`;

                    // Remove existing
                    document.querySelectorAll('.context-menu').forEach(el => el.remove());

                    const menu = document.createElement('div');
                    menu.className = 'context-menu';
                    const x = Math.min(e.clientX, window.innerWidth - 180);
                    const y = Math.min(e.clientY, window.innerHeight - 100);
                    menu.style.left = `${x}px`;
                    menu.style.top = `${y}px`;

                    menu.innerHTML = `
                        ${!file.is_dir ? '<div class="menu-item" id="fs-edit"><i class="fa-solid fa-pen-to-square"></i> 编辑</div>' : ''}
                        <div class="menu-item" id="fs-del"><i class="fa-solid fa-trash"></i> 删除</div>
                        ${!file.is_dir ? '<div class="menu-item" id="fs-down"><i class="fa-solid fa-download"></i> 下载</div>' : ''}
                    `;
                    document.body.appendChild(menu);

                    const closeMenu = () => menu.remove();
                    document.addEventListener('click', closeMenu, { once: true });

                    if (!file.is_dir) {
                        menu.querySelector('#fs-edit').onclick = () => openEditor(this.server.id, fullPath, file.name);
                        menu.querySelector('#fs-down').onclick = () => apiSftpDownload(this.server.id, fullPath);
                    }
                    menu.querySelector('#fs-del').onclick = () => apiSftpDelete(this.server.id, fullPath, file.is_dir).then(() => this.loadPath(this.currentPath));
                };

                listContainer.appendChild(card);
            });

            this.listEl.appendChild(listContainer);

            // 一次性平滑显示所有文件（使用requestAnimationFrame确保流畅）
            requestAnimationFrame(() => {
                const cards = listContainer.querySelectorAll('.file-card');
                cards.forEach((card) => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            });
        }

        destroy() {
            // Cleanup if needed
        }
    }

    // --- 真实 SSH 客户端 (PyWebview Bridge + Xterm.js) ---
    class SSHClient {
        constructor(container, server) {
            this.server = server;

            // Load settings
            const fontSize = parseInt(localStorage.getItem('termFontSize') || '13');
            const cursorStyle = localStorage.getItem('termCursorStyle') || 'bar';
            const termColor = localStorage.getItem('termColor') || 'white';

            // 定义文字颜色映射
            const colorMap = {
                'white': '#ffffff',
                'green': '#4ec9b0',
                'cyan': '#4ec9b0',
                'yellow': '#dcdcaa',
                'blue': '#4fc1ff',
                'orange': '#ffa500'
            };

            const foregroundColor = colorMap[termColor] || '#ffffff';

            // Apply initial theme
            const isLight = document.body.classList.contains('light-mode');
            const darkTheme = {
                background: 'transparent',
                foreground: foregroundColor, // 使用选择的颜色
                cursor: '#4ec9b0',
                cursorAccent: '#1e1e1e',
                selectionBackground: 'rgba(78, 201, 176, 0.25)',
                black: '#1e1e1e', red: '#f48771', green: '#4ec9b0', yellow: '#dcdcaa',
                blue: '#4fc1ff', magenta: '#c586c0', cyan: '#4ec9b0', white: foregroundColor,
                brightBlack: '#666666', brightRed: '#f48771', brightGreen: '#b5cea8',
                brightYellow: '#d7ba7d', brightBlue: '#9cdcfe', brightMagenta: '#c586c0',
                brightCyan: '#4ec9b0', brightWhite: foregroundColor
            };
            const lightTheme = {
                background: 'transparent',
                foreground: '#1a1a1a', // 深色文字，不是纯黑
                cursor: '#005fb8',
                cursorAccent: '#ffffff',
                selectionBackground: 'rgba(0, 95, 184, 0.25)',
                black: '#000000', red: '#cd3131', green: '#00bc66', yellow: '#949800',
                blue: '#0066cc', // 调整蓝色，不要太亮
                magenta: '#bc05bc', cyan: '#0598bc', white: '#1a1a1a', // 白色改为深色
                brightBlack: '#666666', brightRed: '#cd3131', brightGreen: '#14ce14',
                brightYellow: '#b5ba00', brightBlue: '#0066cc', // 调整亮蓝色
                brightMagenta: '#bc05bc', brightCyan: '#0598bc', brightWhite: '#1a1a1a' // 亮白色改为深色
            };

            // 更新暗色主题中的文字颜色
            if (!isLight) {
                darkTheme.foreground = foregroundColor;
                darkTheme.white = foregroundColor;
                darkTheme.brightWhite = foregroundColor;
            }

            this.term = new Terminal({
                cursorBlink: true,
                cursorWidth: 2,
                fontSize: fontSize,
                cursorStyle: cursorStyle,
                lineHeight: 1.2,
                letterSpacing: 0,
                fontFamily: '"Consolas", "Microsoft YaHei", "SimHei", monospace',
                fontWeight: 'bold',
                /* 让 SSH 文字更粗 */
                fontWeightBold: 'bold',
                allowTransparency: true,
                scrollback: 10000,
                theme: isLight ? lightTheme : darkTheme,
                windowsMode: true, // Helps with wrapping
                convertEol: true,
                disableStdin: false,
                rightClickSelectsWord: true
            });

            // Load addons
            this.fitAddon = new FitAddon.FitAddon();
            this.term.loadAddon(this.fitAddon);
            this.term.loadAddon(new WebLinksAddon.WebLinksAddon());

            this.term.open(container);

            // Use ResizeObserver for better fit
            this.resizeObserver = new ResizeObserver(() => {
                // Debounce fit
                if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    try {
                        this.fitAddon.fit();
                        if (this.server && this.server.id) {
                            window.pywebview.api.ssh_resize(this.server.id, this.term.cols, this.term.rows);
                        }
                    } catch (e) { console.error(e); }
                }, 50);
            });
            this.resizeObserver.observe(container);

            // Initial fit
            setTimeout(() => {
                this.fitAddon.fit();
                if (this.server && this.server.id) {
                    window.pywebview.api.ssh_resize(this.server.id, this.term.cols, this.term.rows);
                }
            }, 100);

            // Bind events - 优化输入响应速度
            this.term.onData(data => {
                // 立即发送，不等待
                if (window.pywebview && window.pywebview.api) {
                    // 使用异步调用，不阻塞输入
                    Promise.resolve().then(() => {
                        window.pywebview.api.ssh_send(this.server.id, data);
                    }).catch(() => {});
                }
                // 移除 scrollToBottom，减少延迟
            });

            this._outputHandler = (e) => {
                if (e.detail.id === this.server.id) {
                    this.term.write(e.detail.data);
                    // 如果收到输出且状态是connecting，尝试确认连接是否成功
                    const serverObj = servers.find(s => s.id === this.server.id);
                    if (serverObj && serverObj.status === 'connecting') {
                        // 延迟检查，确保连接稳定
                        setTimeout(async () => {
                            // 通过获取统计数据来确认连接是否真的成功
                            const realStats = await apiGetRealStats(this.server.id);
                            if (realStats && serverObj.status !== 'error') {
                                // 只有能获取到统计数据才说明连接成功
                                serverObj.status = 'online';
                                serverObj.cpu = realStats.cpu;
                                serverObj.mem = realStats.mem;
                                serverObj.disk = realStats.disk;
                                if (realStats.cpu_cores !== undefined) serverObj.cpu_cores = realStats.cpu_cores;
                                if (realStats.cpu_used_cores !== undefined) serverObj.cpu_used_cores = realStats.cpu_used_cores;
                                if (realStats.mem_total_mb !== undefined) serverObj.mem_total_mb = realStats.mem_total_mb;
                                if (realStats.mem_used_mb !== undefined) serverObj.mem_used_mb = realStats.mem_used_mb;
                                if (realStats.disk_total_gb !== undefined) serverObj.disk_total_gb = realStats.disk_total_gb;
                                if (realStats.disk_used_gb !== undefined) serverObj.disk_used_gb = realStats.disk_used_gb;
                                if (realStats.net_rx_speed_kb !== undefined) serverObj.net_rx_speed_kb = realStats.net_rx_speed_kb;
                                if (realStats.net_tx_speed_kb !== undefined) serverObj.net_tx_speed_kb = realStats.net_tx_speed_kb;
                                debouncedRenderServers(); // 使用防抖渲染，避免跳动
                            } else if (serverObj.status === 'connecting') {
                                // 如果获取统计数据失败，保持connecting状态，等待连接错误事件或超时后设置为offline
                            }
                        }, 2000); // 等待2秒后检查连接状态
                    }
                }
            };
            window.addEventListener('ssh_output', this._outputHandler);

            this._disconnectHandler = (e) => {
                if (e.detail.id === this.server.id) {
                    this.term.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n');
                }
            };
            window.addEventListener('ssh_disconnect', this._disconnectHandler);

            // 设置连接中状态，显示加载动画
            const serverObj = servers.find(s => s.id === this.server.id);
            if (serverObj && serverObj.status !== 'error' && serverObj.status !== 'online') {
                serverObj.status = 'connecting';
                debouncedRenderServers(); // 显示连接中状态
            }

            // Connect
            window.pywebview.api.ssh_connect(this.server.id);

            // Window resize fallback
            this._resizeHandler = () => {
                this.fitAddon.fit();
                if (this.server && this.server.id) {
                    window.pywebview.api.ssh_resize(this.server.id, this.term.cols, this.term.rows);
                }
            };
            window.addEventListener('resize', this._resizeHandler);

            // Auto copy
            this.term.onSelectionChange(() => {
                if (this.term.hasSelection()) {
                    const text = this.term.getSelection();
                    navigator.clipboard.writeText(text).catch(() => { });
                }
            });
        }

        getBuffer() {
            if (!this.term) return '';
            const buffer = this.term.buffer.active;
            const lines = [];
            const start = Math.max(0, buffer.length - 100);
            for (let i = start; i < buffer.length; i++) {
                const line = buffer.getLine(i);
                if (line) lines.push(line.translateToString(true));
            }
            return lines.join('\n');
        }

        focus() {
            this.term.focus();
        }

        destroy() {
            window.removeEventListener('resize', this._resizeHandler);
            window.removeEventListener('ssh_output', this._outputHandler);
            window.removeEventListener('ssh_disconnect', this._disconnectHandler);

            window.pywebview.api.ssh_close(this.server.id);
            if (this.resizeObserver) this.resizeObserver.disconnect();
            this.term.dispose();
        }
    }

    const tabs = new TabManager();

    // 监听标签页切换，检查是否需要显示锁屏（只锁住机器管理页面）
    const originalActivate = tabs.activate.bind(tabs);
    tabs.activate = function (id) {
        originalActivate(id);
        // 切换标签页后检查锁屏状态（只在应用锁开启时）
        const isLocked = localStorage.getItem('isLocked') === 'true';
        if (isLocked) {
            setTimeout(() => {
                if (typeof checkLock === 'function') {
                    checkLock();
                }
            }, 100);
        } else {
            // 确保锁屏被隐藏
            if (lockScreen) lockScreen.classList.add('hidden');
            if (dashboardContainer) {
                dashboardContainer.style.pointerEvents = '';
                dashboardContainer.style.opacity = '';
            }
        }
    };
    const tabDashboard = document.getElementById('tab-dashboard');
    if (tabDashboard) tabDashboard.addEventListener('click', () => tabs.activate('dashboard'));

    // --- 侧边栏导航逻辑 (Refactored) ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navSettings = document.getElementById('nav-settings');

    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.activate('dashboard');
        });
    }

    if (navSettings) {
        navSettings.addEventListener('click', (e) => {
            e.preventDefault();
            // 如果当前已经在设置页，则返回上一个页面（通常是 dashboard 或最近的 session）
            if (tabs.activeTabId === 'settings') {
                // 这里简单返回 dashboard，如果需要更复杂的历史记录可以扩展 TabManager
                tabs.activate('dashboard');
            } else {
                tabs.openSettings();
            }
        });
    }



    // --- Settings Logic (Font Size & Cursor & Mode) ---
    const settingFontSize = document.getElementById('setting-font-size');
    const settingCursorStyle = document.getElementById('setting-cursor-style');
    const settingLanguage = document.getElementById('setting-language');
    const settingSnapLayout = document.getElementById('setting-snap-layout');

    // Load saved settings
    const savedFontSize = localStorage.getItem('termFontSize') || '13';
    const savedCursorStyle = localStorage.getItem('termCursorStyle') || 'bar';
    const savedLanguage = localStorage.getItem('appLanguage') || 'zh-CN';
    const savedSnapLayout = localStorage.getItem('appSnapLayout') !== 'false';

    if (settingFontSize) {
        settingFontSize.value = savedFontSize;
        settingFontSize.addEventListener('change', async (e) => {
            localStorage.setItem('termFontSize', e.target.value);
            await saveSettingToFile('termFontSize', e.target.value);
            applyTerminalSettings();
            showToast('字体大小已保存');
        });
    }

    if (settingCursorStyle) {
        settingCursorStyle.value = savedCursorStyle;
        settingCursorStyle.addEventListener('change', async (e) => {
            localStorage.setItem('termCursorStyle', e.target.value);
            await saveSettingToFile('termCursorStyle', e.target.value);
            applyTerminalSettings();
            showToast('光标样式已保存');
        });
    }

    // 终端文字颜色设置
    const settingTermColor = document.getElementById('setting-term-color');
    const savedTermColor = localStorage.getItem('termColor') || 'white';
    if (settingTermColor) {
        settingTermColor.value = savedTermColor;
        settingTermColor.addEventListener('change', async (e) => {
            localStorage.setItem('termColor', e.target.value);
            await saveSettingToFile('termColor', e.target.value);
            applyTerminalSettings();
            showToast('终端文字颜色已保存');
        });
    }

    if (settingLanguage) {
        settingLanguage.value = savedLanguage;
        settingLanguage.addEventListener('change', async (e) => {
            localStorage.setItem('appLanguage', e.target.value);
            await saveSettingToFile('appLanguage', e.target.value);
            showToast('语言设置已保存');
        });
    }

    if (settingSnapLayout) {
        settingSnapLayout.checked = savedSnapLayout;
        settingSnapLayout.addEventListener('change', async (e) => {
            localStorage.setItem('appSnapLayout', e.target.checked.toString());
            await saveSettingToFile('appSnapLayout', e.target.checked.toString());
            showToast('贴靠布局设置已保存');
        });
    }

    // 主题色选择器
    const settingThemeColor = document.getElementById('setting-theme-color');
    if (settingThemeColor) {
        const savedThemeColor = localStorage.getItem('themeColor') || 'purple';
        settingThemeColor.value = savedThemeColor;
        applyThemeColor(savedThemeColor);

        settingThemeColor.addEventListener('change', async (e) => {
            const color = e.target.value;
            localStorage.setItem('themeColor', color);
            await saveSettingToFile('themeColor', color);
            applyThemeColor(color);
            showToast('主题色已更新');
        });
    }

    function applyThemeColor(color) {
        const colorMap = {
            'purple': { main: '#8b5cf6', hover: '#7c3aed' },
            'blue': { main: '#3b82f6', hover: '#2563eb' },
            'green': { main: '#10b981', hover: '#059669' },
            'cyan': { main: '#06b6d4', hover: '#0891b2' },
            'pink': { main: '#ec4899', hover: '#db2777' },
            'orange': { main: '#f59e0b', hover: '#d97706' },
            'red': { main: '#ef4444', hover: '#dc2626' }
        };

        const colors = colorMap[color] || colorMap['purple'];
        document.documentElement.style.setProperty('--theme-color', colors.main);
        document.documentElement.style.setProperty('--theme-color-hover', colors.hover);
        // 同时更新accent-blue以保持兼容性，让所有使用accent-blue的地方也自动更新
        document.documentElement.style.setProperty('--accent-blue', colors.main);
        document.documentElement.style.setProperty('--accent-blue-hover', colors.hover);
        // 同时更新accent-blue以保持兼容性，让所有使用accent-blue的地方也自动更新
        document.documentElement.style.setProperty('--accent-blue', colors.main);
        document.documentElement.style.setProperty('--accent-blue-hover', colors.hover);
    }


    // 流星雨彩蛋效果
    function triggerMeteorShower() {
        console.log('触发流星雨效果');
        // 检查是否已经存在流星雨容器
        let meteorContainer = document.querySelector('.meteor-shower-container');
        if (meteorContainer) {
            // 如果已存在，移除后重新添加以重新播放动画
            meteorContainer.remove();
        }

        // 创建流星雨容器
        meteorContainer = document.createElement('div');
        meteorContainer.className = 'meteor-shower-container';
        document.body.appendChild(meteorContainer);

        console.log('流星雨容器已创建', meteorContainer);

        // 强制触发重排以确保动画开始
        meteorContainer.offsetHeight;

        // 5秒后自动移除
        setTimeout(() => {
            if (meteorContainer && meteorContainer.parentNode) {
                meteorContainer.remove();
                console.log('流星雨容器已移除');
            }
        }, 5000);
    }

    // --- Advanced Settings ---
    const settingTermScrollback = document.getElementById('setting-term-scrollback');
    const settingKeepAlive = document.getElementById('setting-keepalive');

    if (settingTermScrollback) {
        settingTermScrollback.value = localStorage.getItem('termScrollback') || '5000';
        settingTermScrollback.addEventListener('change', (e) => {
            localStorage.setItem('termScrollback', e.target.value);
            // Apply to active terminals if possible, or just next session
            showToast('设置已保存 (下次连接生效)');
        });
    }

    if (settingKeepAlive) {
        settingKeepAlive.value = localStorage.getItem('sshKeepAlive') || '60';
        settingKeepAlive.addEventListener('change', (e) => {
            localStorage.setItem('sshKeepAlive', e.target.value);
            showToast('设置已保存 (下次连接生效)');
        });
    }

    function applyTerminalSettings() {
        const size = parseInt(localStorage.getItem('termFontSize') || '13');
        const cursor = localStorage.getItem('termCursorStyle') || 'bar';
        const termColor = localStorage.getItem('termColor') || 'white';
        const isLight = document.body.classList.contains('light-mode');

        // 定义文字颜色映射
        const colorMap = {
            'white': '#ffffff',
            'green': '#4ec9b0',
            'cyan': '#4ec9b0',
            'yellow': '#dcdcaa',
            'blue': '#4fc1ff',
            'orange': '#ffa500'
        };

        const foregroundColor = colorMap[termColor] || '#ffffff';

        // Define themes
        const darkTheme = {
            background: 'transparent',
            foreground: foregroundColor, // 使用选择的颜色
            cursor: '#4ec9b0',
            cursorAccent: '#1e1e1e',
            selectionBackground: 'rgba(78, 201, 176, 0.25)',
            black: '#1e1e1e', red: '#f48771', green: '#4ec9b0', yellow: '#dcdcaa',
            blue: '#4fc1ff', magenta: '#c586c0', cyan: '#4ec9b0', white: foregroundColor,
            brightBlack: '#666666', brightRed: '#f48771', brightGreen: '#b5cea8',
            brightYellow: '#d7ba7d', brightBlue: '#9cdcfe', brightMagenta: '#c586c0',
            brightCyan: '#4ec9b0', brightWhite: foregroundColor
        };

        // Logo Animation Logic - 使用slice loader动画，默认一直转
        const logoLoader = document.querySelector('.logo-loader');
        const logoContainer = document.querySelector('.logo-container');
        if (logoLoader && logoContainer) {
            // 默认不暂停，一直转动
            logoContainer.classList.remove('paused');

            // 点击切换暂停/继续，并触发流星雨彩蛋
            logoLoader.addEventListener('click', () => {
                if (logoContainer.classList.contains('paused')) {
                    logoContainer.classList.remove('paused');
                } else {
                    logoContainer.classList.add('paused');
                }

                // 触发流星雨彩蛋
                triggerMeteorShower();
            });
        }


        // ... (Inside applyTerminalSettings) ...
        const lightTheme = {
            background: 'transparent', // Keep transparent for glass effect
            foreground: '#1a1a1a', // Dark text for visibility
            cursor: '#005fb8',
            cursorAccent: '#ffffff',
            selectionBackground: 'rgba(0, 95, 184, 0.25)',
            black: '#000000', red: '#cd3131', green: '#00bc66', yellow: '#949800',
            blue: '#0451a5', magenta: '#bc05bc', cyan: '#0598bc', white: '#555555',
            brightBlack: '#666666', brightRed: '#cd3131', brightGreen: '#14ce14',
            brightYellow: '#b5ba00', brightBlue: '#0451a5', brightMagenta: '#bc05bc',
            brightCyan: '#0598bc', brightWhite: '#a5a5a5'
        };

        // ... (Inside openSftp) ...
        // Default to / instead of /root
        const initialPath = '/';


        // 更新主题中的文字颜色（仅暗色模式）
        if (!isLight) {
            darkTheme.foreground = foregroundColor;
            darkTheme.white = foregroundColor;
            darkTheme.brightWhite = foregroundColor;
        }

        const currentTheme = isLight ? lightTheme : darkTheme;

        // Update all active instances
        tabs.tabs.forEach(session => {
            if (session.instance && session.instance.term) {
                session.instance.term.options.fontSize = size;
                session.instance.term.options.cursorStyle = cursor;
                // 微软雅黑不需要额外的字间距，否则会非常稀疏
                session.instance.term.options.lineHeight = 1.2;
                session.instance.term.options.letterSpacing = 0;
                // 使用中文名称 '微软雅黑' 以确保兼容性，放在最前面
                session.instance.term.options.fontFamily = '"Microsoft YaHei", "微软雅黑", "SimHei", sans-serif';
                // 让 SSH 文字更粗
                session.instance.term.options.fontWeight = 'bold';
                session.instance.term.options.fontWeightBold = 'bold';

                // Apply Theme
                session.instance.term.options.theme = currentTheme;

                // Trigger resize to adjust layout
                if (session.instance.fitAddon) session.instance.fitAddon.fit();
            }
        });
    }

    // --- 防抖渲染函数（在renderServers之前定义） ---
    let renderDebounceTimer = null;
    function debouncedRenderServers() {
        if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
        renderDebounceTimer = setTimeout(() => {
            renderServers();
        }, 150); // 防抖150ms，避免频繁更新导致跳动
    }

    // --- 渲染逻辑 ---
    function renderServers() {
        if (!sessionGrid) return;

        // 系统图标映射
        const osIconMap = {
            'ubuntu': { icon: 'fa-ubuntu', bg: 'ubuntu' },
            'debian': { icon: 'fa-debian', bg: 'debian' },
            'centos': { icon: 'fa-centos', bg: 'centos' },
            'fedora': { icon: 'fa-fedora', bg: 'fedora' },
            'alpine': { icon: 'fa-alpine', bg: 'alpine' },
            'arch': { icon: 'fa-archlinux', bg: 'arch' },
            'opensuse': { icon: 'fa-opensuse', bg: 'opensuse' },
            'redhat': { icon: 'fa-redhat', bg: 'redhat' },
            'rocky': { icon: 'fa-rocky-linux', bg: 'rocky' },
            'almalinux': { icon: 'fa-almalinux', bg: 'almalinux' },
            'linux': { icon: 'fa-linux', bg: 'linux' }
        };

        const getLoadClass = (val) => val > 80 ? 'danger' : (val > 50 ? 'warning' : 'normal');

        // 获取现有的卡片映射
        const existingCards = new Map();
        Array.from(sessionGrid.children).forEach(card => {
            const id = parseInt(card.dataset.id);
            if (id) existingCards.set(id, card);
        });

        // 清空网格，准备重新渲染
        sessionGrid.innerHTML = '';

        servers.forEach((server, index) => {
            // 确保服务器状态有效，默认为 offline
            if (!server.status || (server.status !== 'online' && server.status !== 'offline' && server.status !== 'error' && server.status !== 'connecting')) {
                server.status = 'offline';
            }
            
            let card = existingCards.get(server.id);
            const isNewCard = !card;

            if (isNewCard) {
                // 创建新卡片
                card = document.createElement('div');
                card.className = 'server-card';
                card.dataset.id = server.id;
                // 只在首次创建时添加动画
                card.classList.add('animate-in');
                card.style.animationDelay = `${index * 0.08}s`;
            } else {
                // 更新现有卡片，移除动画类避免重新播放
                card.classList.remove('animate-in');
                card.style.animationDelay = '';
            }

            const osInfo = osIconMap[server.os?.toLowerCase()] || osIconMap['linux'];
            let osIconClass = osInfo.icon;
            let osBgClass = osInfo.bg;

            card.innerHTML = `
                <div class="card-clickable">
                    <div class="card-header">
                        <div class="os-icon ${osBgClass}">
                            <i class="fa-brands ${osIconClass}"></i>
                            <span class="status-dot ${server.status || 'offline'}"></span>
                        </div>
                        <div class="server-info">
                            <div class="server-ip">${server.name}</div>
                            <div class="server-sub copy-ip" title="点击复制 IP">
                                ${server.host}
                            </div>
                        </div>
                        <div class="card-tools">
                            <button class="tool-btn web-btn" title="web端开发中敬请期待"><i class="fa-brands fa-chrome"></i></button>
                            <button class="tool-btn sftp-btn" title="文件管理"><i class="fa-regular fa-folder-open"></i></button>
                            <button class="tool-btn connect-btn" title="连接终端"><i class="fa-solid fa-link"></i></button>
                            <div class="more-menu-wrapper">
                                <button class="tool-btn more-btn" title="更多操作"><i class="fa-solid fa-ellipsis"></i></button>
                                <div class="dropdown-menu hidden">
                                    <div class="menu-item edit-btn"><i class="fa-solid fa-pen"></i> 编辑</div>
                                    <div class="menu-item delete-btn"><i class="fa-solid fa-trash"></i> 删除</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-header">
                                <span>CPU:</span>
                                <span class="val-cpu">${server.status === 'online' ? (server.cpu || 0) + '%' : '--'}</span>
                            </div>
                            <div class="progress-bg">
                                <div class="progress-fill bar-cpu ${getLoadClass(server.cpu || 0)}" style="width: ${server.status === 'online' ? (server.cpu || 0) : 0}%;"></div>
                            </div>
                            <div class="stat-detail">
                                ${server.status === 'online' && server.cpu_cores !== undefined ?
                    `${server.cpu_used_cores || 0}/${server.cpu_cores || 1} 核心` : '--'}
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-header">
                                <span>内存:</span>
                                <span class="val-mem">${server.status === 'online' ? (server.mem || 0) + '%' : '--'}</span>
                            </div>
                            <div class="progress-bg">
                                <div class="progress-fill bar-mem ${getLoadClass(server.mem || 0)}" style="width: ${server.status === 'online' ? (server.mem || 0) : 0}%;"></div>
                            </div>
                            <div class="stat-detail">
                                ${server.status === 'online' && server.mem_used_mb !== undefined ?
                    `${server.mem_used_mb} MB/${(server.mem_total_mb / 1024).toFixed(2)} GB` : '--'}
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-header">
                                <span>存储:</span>
                                <span class="val-disk">${server.status === 'online' ? (server.disk || 0) + '%' : '--'}</span>
                            </div>
                            <div class="progress-bg">
                                <div class="progress-fill bar-disk ${getLoadClass(server.disk || 0)}" style="width: ${server.status === 'online' ? (server.disk || 0) : 0}%;"></div>
                            </div>
                            <div class="stat-detail">
                                ${server.status === 'online' && server.disk_used_gb !== undefined ?
                    `${server.disk_used_gb}GB/${server.disk_total_gb || 0}GB` : '--'}
                            </div>
                        </div>
                        <div class="stat-item network-stats">
                            ${server.status === 'online' && (server.net_rx_speed_kb !== undefined || server.net_tx_speed_kb !== undefined) ? `
                            <div class="net-row">
                                <i class="fa-solid fa-arrow-down down-icon"></i>
                                <span class="net-in">${formatSpeed(server.net_rx_speed_kb || 0)}</span>
                            </div>
                            <div class="net-row">
                                <i class="fa-solid fa-arrow-up up-icon"></i>
                                <span class="net-out">${formatSpeed(server.net_tx_speed_kb || 0)}</span>
                            </div>
                            ` : `
                            <div class="net-row">
                                <span>--</span>
                            </div>
                            <div class="net-row">
                                <span>--</span>
                            </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
            sessionGrid.appendChild(card);
        });
        // Removed badge updates
        if (paginationText) paginationText.innerText = `${servers.length}/${servers.length}`;
    }

    // --- Real-time Monitor Loop ---
    setInterval(async () => {
        if (servers.length === 0) return;

        // 1. Fetch REAL stats for all online servers (for dashboard)
        // Only fetch for servers that are actually connected (have SSH client)
        let hasUpdates = false;
        for (const server of servers) {
            if (server.status === 'online') {
                try {
                    const realStats = await apiGetRealStats(server.id);
                    if (realStats) {
                        // 只在数据真正变化时才标记需要更新
                        if (server.cpu !== realStats.cpu ||
                            server.mem !== realStats.mem ||
                            server.disk !== realStats.disk) {
                            hasUpdates = true;
                        }
                        server.cpu = realStats.cpu;
                        server.mem = realStats.mem;
                        server.disk = realStats.disk;
                        // Update new detailed fields
                        if (realStats.cpu_cores !== undefined) server.cpu_cores = realStats.cpu_cores;
                        if (realStats.cpu_used_cores !== undefined) server.cpu_used_cores = realStats.cpu_used_cores;
                        if (realStats.mem_total_mb !== undefined) server.mem_total_mb = realStats.mem_total_mb;
                        if (realStats.mem_used_mb !== undefined) server.mem_used_mb = realStats.mem_used_mb;
                        if (realStats.disk_total_gb !== undefined) server.disk_total_gb = realStats.disk_total_gb;
                        if (realStats.disk_used_gb !== undefined) server.disk_used_gb = realStats.disk_used_gb;
                        if (realStats.net_rx_speed_kb !== undefined) server.net_rx_speed_kb = realStats.net_rx_speed_kb;
                        if (realStats.net_tx_speed_kb !== undefined) server.net_tx_speed_kb = realStats.net_tx_speed_kb;
                    }
                } catch (e) {
                    // Silently ignore errors - server might not be connected yet
                }
            }
        }
        // 只在有更新时才重新渲染，使用防抖避免频繁更新
        if (hasUpdates) {
            debouncedRenderServers();
        }
        // Always update display to reflect current state
        updateLiveStats(); // Dashboard update

        // 2. Update Sidebar UI for active session
        if (tabs.activeTabId && tabs.activeTabId.startsWith('session-')) {
            const serverId = parseInt(tabs.activeTabId.replace('session-', ''));
            const server = servers.find(s => s.id === serverId);

            if (server && server.status === 'online') {
                // Update Sidebar UI directly
                if (sbCpuVal) sbCpuVal.innerText = server.cpu + '%';
                const sbCpuBar = document.getElementById('sb-cpu-bar');
                if (sbCpuBar) sbCpuBar.style.width = server.cpu + '%';

                const sbMemVal = document.getElementById('sb-mem-val');
                if (sbMemVal) sbMemVal.innerText = server.mem + '%';
                const sbMemBar = document.getElementById('sb-mem-bar');
                if (sbMemBar) sbMemBar.style.width = server.mem + '%';

                const sbDiskVal = document.getElementById('sb-disk-val');
                if (sbDiskVal) sbDiskVal.innerText = server.disk + '%';
                const sbDiskBar = document.getElementById('sb-disk-bar');
                if (sbDiskBar) sbDiskBar.style.width = server.disk + '%';
            }
        }
    }, 2000); // 2秒轮询一次真实数据

    function updateLiveStats() {
        const cards = document.querySelectorAll('.server-card');
        cards.forEach(card => {
            const id = parseInt(card.dataset.id);
            const server = servers.find(s => s.id === id);
            if (server && server.status === 'online') {
                // Update CPU
                const cpuPercent = server.cpu || 0;
                const cpuValEl = card.querySelector('.val-cpu');
                const cpuBarEl = card.querySelector('.bar-cpu');
                const cpuDetailEl = card.querySelector('.stat-item:first-child .stat-detail');
                if (cpuValEl) cpuValEl.innerText = cpuPercent + '%';
                if (cpuBarEl) {
                    cpuBarEl.style.width = cpuPercent + '%';
                    cpuBarEl.classList.remove('normal', 'warning', 'danger');
                    if (cpuPercent > 80) {
                        cpuBarEl.classList.add('danger');
                        cpuBarEl.style.backgroundColor = '#ef4444';
                    } else if (cpuPercent > 50) {
                        cpuBarEl.classList.add('warning');
                        cpuBarEl.style.backgroundColor = '#f59e0b';
                    } else {
                        cpuBarEl.classList.add('normal');
                        cpuBarEl.style.backgroundColor = '#10b981';
                    }
                }
                if (cpuDetailEl && server.cpu_cores !== undefined) {
                    cpuDetailEl.innerText = `${server.cpu_used_cores || 0}/${server.cpu_cores || 1} 核心`;
                }

                // Update Memory
                const memPercent = server.mem || 0;
                const memValEl = card.querySelector('.val-mem');
                const memBarEl = card.querySelector('.bar-mem');
                const memDetailEl = card.querySelectorAll('.stat-item .stat-detail')[1];
                if (memValEl) memValEl.innerText = memPercent + '%';
                if (memBarEl) {
                    memBarEl.style.width = memPercent + '%';
                    memBarEl.classList.remove('normal', 'warning', 'danger');
                    if (memPercent > 80) {
                        memBarEl.classList.add('danger');
                        memBarEl.style.backgroundColor = '#ef4444';
                    } else if (memPercent > 50) {
                        memBarEl.classList.add('warning');
                        memBarEl.style.backgroundColor = '#f59e0b';
                    } else {
                        memBarEl.classList.add('normal');
                        memBarEl.style.backgroundColor = '#10b981';
                    }
                }
                if (memDetailEl && server.mem_used_mb !== undefined) {
                    memDetailEl.innerText = `${server.mem_used_mb} MB/${(server.mem_total_mb / 1024).toFixed(2)} GB`;
                }

                // Update Disk
                const diskPercent = server.disk || 0;
                const diskValEl = card.querySelector('.val-disk');
                const diskBarEl = card.querySelector('.bar-disk');
                const diskDetailEl = card.querySelectorAll('.stat-item .stat-detail')[2];
                if (diskValEl) diskValEl.innerText = diskPercent + '%';
                if (diskBarEl) {
                    diskBarEl.style.width = diskPercent + '%';
                    diskBarEl.classList.remove('normal', 'warning', 'danger');
                    if (diskPercent > 80) {
                        diskBarEl.classList.add('danger');
                        diskBarEl.style.backgroundColor = '#ef4444';
                    } else if (diskPercent > 50) {
                        diskBarEl.classList.add('warning');
                        diskBarEl.style.backgroundColor = '#f59e0b';
                    } else {
                        diskBarEl.classList.add('normal');
                        diskBarEl.style.backgroundColor = '#10b981';
                    }
                }
                if (diskDetailEl && server.disk_used_gb !== undefined) {
                    diskDetailEl.innerText = `${server.disk_used_gb}GB/${server.disk_total_gb || 0}GB`;
                }

                // Update Network
                const netInEl = card.querySelector('.net-in');
                const netOutEl = card.querySelector('.net-out');
                if (netInEl && server.net_rx_speed_kb !== undefined) {
                    netInEl.innerText = formatSpeed(server.net_rx_speed_kb);
                }
                if (netOutEl && server.net_tx_speed_kb !== undefined) {
                    netOutEl.innerText = formatSpeed(server.net_tx_speed_kb);
                }
            }
        });
    }

    // --- 事件委托 ---
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.more-menu-wrapper')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        }
    });

    if (sessionGrid) {
        sessionGrid.addEventListener('click', (e) => {
            const target = e.target;

            // 0. 更多菜单
            const moreBtn = target.closest('.more-btn');
            if (moreBtn) {
                e.stopPropagation();
                const wrapper = moreBtn.closest('.more-menu-wrapper');
                const menu = wrapper.querySelector('.dropdown-menu');
                document.querySelectorAll('.dropdown-menu').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
                menu.classList.toggle('hidden');
                return;
            }

            // 1. 复制 (直接点击 IP)
            const copyTarget = target.closest('.copy-ip');
            if (copyTarget) {
                e.stopPropagation();
                const ip = copyTarget.innerText.trim();
                navigator.clipboard.writeText(ip).then(() => {
                    const originalColor = copyTarget.style.color;
                    copyTarget.style.color = '#10b981'; // Green
                    showToast('IP 已复制: ' + ip);
                    setTimeout(() => copyTarget.style.color = '', 1000);
                });
                return;
            }

            // 2. 编辑
            const editBtn = target.closest('.edit-btn');
            if (editBtn) {
                e.stopPropagation();
                editBtn.closest('.dropdown-menu').classList.add('hidden');
                const id = parseInt(editBtn.closest('.server-card').dataset.id);
                const server = servers.find(s => s.id === id);
                if (server) {
                    currentEditingId = id;
                    openModal(true, server);
                }
                return;
            }

            // 3. 删除
            const deleteBtn = target.closest('.delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                deleteBtn.closest('.dropdown-menu').classList.add('hidden');
                // 使用自定义对话框，只显示"是否删除"
                showDialog('confirm', '是否删除？', '').then((confirmed) => {
                    if (confirmed) {
                        const id = parseInt(deleteBtn.closest('.server-card').dataset.id);
                        apiDeleteServer(id).then(() => {
                            servers = servers.filter(s => s.id !== id);
                            debouncedRenderServers(); // 使用防抖渲染，避免跳动
                            tabs.close(`session-${id}`);
                        });
                    }
                });
                return;
            }

            // 4. 连接 (SSH)
            const connectBtn = target.closest('.connect-btn');
            if (connectBtn) {
                e.stopPropagation();
                const id = parseInt(connectBtn.closest('.server-card').dataset.id);
                const server = servers.find(s => s.id === id);
                if (server) tabs.openSession(server);
                return;
            }

            // 6. 文件管理 (SFTP)
            const sftpBtn = target.closest('.sftp-btn');
            if (sftpBtn) {
                e.stopPropagation();
                // 添加点击反馈
                const icon = sftpBtn.querySelector('i');
                const originalClass = icon.className;
                icon.className = 'fa-solid fa-circle-notch fa-spin'; // 立即显示转圈

                const id = parseInt(sftpBtn.closest('.server-card').dataset.id);
                const server = servers.find(s => s.id === id);

                // 稍微延迟一点执行打开操作，让 UI 有机会刷新转圈动画
                requestAnimationFrame(() => {
                    if (server) tabs.openSftp(server);
                    // 恢复图标 (虽然 Tab 打开后可能看不到了，但为了逻辑完整性)
                    setTimeout(() => icon.className = originalClass, 500);
                });
                return;
            }

            // 5. 详情 (点击卡片主体)
            const clickableArea = target.closest('.card-clickable');
            if (clickableArea) {
                const id = parseInt(clickableArea.closest('.server-card').dataset.id);
                const server = servers.find(s => s.id === id);
                if (server) openDetailsModal(server);
            }
        });
    }

    // --- 详情模态框 ---
    function openDetailsModal(server) {
        if (detailName) detailName.innerText = server.name;
        if (detailStatus) {
            if (server.status === 'online') {
                detailStatus.innerText = 'RUNNING';
                detailStatus.style.color = '#10b981';
                detailStatus.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                detailStatus.style.background = 'rgba(16, 185, 129, 0.05)';
            } else if (server.status === 'error') {
                detailStatus.innerText = 'CONNECTION ERROR';
                detailStatus.style.color = '#ef4444';
                detailStatus.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                detailStatus.style.background = 'rgba(239, 68, 68, 0.05)';
            } else {
                detailStatus.innerText = 'STOPPED';
                detailStatus.style.color = '#ef4444';
                detailStatus.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                detailStatus.style.background = 'rgba(239, 68, 68, 0.05)';
            }
        }
        if (detailHost) detailHost.innerText = server.host;
        if (detailPort) detailPort.innerText = server.port;
        if (detailUser) detailUser.innerText = server.user;
        if (detailAdded) detailAdded.innerText = server.addedTime || 'Unknown';

        // 更新详情页的资源数据 (文本 + 进度条)
        const updateResource = (idPrefix, val) => {
            const textEl = document.getElementById(`detail-${idPrefix}`);
            const barEl = document.getElementById(`bar-${idPrefix}`);
            if (textEl) textEl.innerText = (val || 0) + '%';
            if (barEl) {
                barEl.style.width = (val || 0) + '%';
                // 动态颜色
                let color = '#5c7cfa'; // default blue
                if (val > 80) color = '#ef4444';
                else if (val > 50) color = '#f59e0b';
                else color = '#10b981';
                barEl.style.backgroundColor = color;
            }
        };

        updateResource('cpu', server.cpu);
        updateResource('mem', server.mem);
        updateResource('disk', server.disk);

        if (detailRemark) detailRemark.value = server.remark || '';
        if (detailOs) {
            let osName = 'Unknown Linux';
            const osMap = {
                'ubuntu': 'Ubuntu',
                'centos': 'CentOS',
                'debian': 'Debian',
                'fedora': 'Fedora',
                'alpine': 'Alpine Linux',
                'arch': 'Arch Linux',
                'opensuse': 'openSUSE',
                'redhat': 'Red Hat',
                'rocky': 'Rocky Linux',
                'almalinux': 'AlmaLinux'
            };
            if (server.os && osMap[server.os.toLowerCase()]) {
                osName = osMap[server.os.toLowerCase()];
            } else if (server.os) {
                osName = server.os.charAt(0).toUpperCase() + server.os.slice(1);
            }
            detailOs.innerText = osName;
        }

        currentDetailId = server.id;

        if (modalDetailsOverlay) modalDetailsOverlay.classList.remove('hidden');
    }

    // Removed btnSaveRemark listener

    if (closeDetailsButtons) closeDetailsButtons.forEach(btn => btn.addEventListener('click', () => modalDetailsOverlay.classList.add('hidden')));
    if (modalDetailsOverlay) modalDetailsOverlay.addEventListener('click', (e) => { if (e.target === modalDetailsOverlay) modalDetailsOverlay.classList.add('hidden'); });

    // --- 编辑/新建模态框 ---
    function updateCharCount(input, counter, max) { if (input && counter) counter.innerText = `${input.value.length} / ${max}`; }
    if (inputName) inputName.addEventListener('input', () => updateCharCount(inputName, nameCount, 30));
    if (inputRemark) inputRemark.addEventListener('input', () => updateCharCount(inputRemark, remarkCount, 50));
    if (passwordToggle) passwordToggle.addEventListener('click', () => {
        if (inputPassword.type === 'password') { inputPassword.type = 'text'; passwordToggle.className = 'fa-solid fa-eye password-toggle'; }
        else { inputPassword.type = 'password'; passwordToggle.className = 'fa-solid fa-eye-slash password-toggle'; }
    });

    // 私钥密码切换
    if (keyPassphraseToggle) keyPassphraseToggle.addEventListener('click', () => {
        if (inputKeyPassphrase.type === 'password') { 
            inputKeyPassphrase.type = 'text'; 
            keyPassphraseToggle.className = 'fa-solid fa-eye password-toggle'; 
        } else { 
            inputKeyPassphrase.type = 'password'; 
            keyPassphraseToggle.className = 'fa-solid fa-eye-slash password-toggle'; 
        }
    });

    // 验证方式切换
    function toggleAuthMethod() {
        const selectedMethod = document.querySelector('input[name="auth-method"]:checked').value;
        if (selectedMethod === 'password') {
            passwordRow.classList.remove('hidden');
            keyFileRow.classList.add('hidden');
            keyPassphraseRow.classList.add('hidden');
        } else {
            passwordRow.classList.add('hidden');
            keyFileRow.classList.remove('hidden');
            keyPassphraseRow.classList.remove('hidden');
        }
    }

    // 监听验证方式变化
    authRadios.forEach(radio => {
        radio.addEventListener('change', toggleAuthMethod);
    });

    // 文件选择
    if (btnSelectKey) btnSelectKey.addEventListener('click', () => {
        inputKeyFile.click();
    });

    if (inputKeyFile) inputKeyFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            inputKeyPath.value = file.name;
            // 读取文件内容
            const reader = new FileReader();
            reader.onload = (e) => {
                inputKeyFile.fileContent = e.target.result;
            };
            reader.readAsText(file);
        }
    });

    if (inputKeyPath) inputKeyPath.addEventListener('click', () => {
        inputKeyFile.click();
    });

    function openModal(isEdit, data = {}) {
        if (!modalTitle) return;

        inputName.value = ''; inputHost.value = ''; inputPort.value = 22;
        inputUser.value = 'root'; inputPassword.value = ''; 
        inputRemark.value = ''; authRadios[0].checked = true;
        inputKeyPath.value = ''; inputKeyPassphrase.value = '';

        if (isEdit) {
            modalTitle.innerText = '编辑机器';
            btnSave.innerText = '保存';
            inputName.value = data.name; inputHost.value = data.host; inputPort.value = data.port;
            inputUser.value = data.user; inputPassword.value = data.password || '';
            inputRemark.value = data.remark || '';
            if (data.auth === 'key') {
                authRadios[1].checked = true;
                inputKeyPath.value = data.keyPath || '';
                inputKeyPassphrase.value = data.keyPassphrase || '';
                if (data.keyContent) {
                    inputKeyFile.fileContent = data.keyContent;
                }
            } else {
                authRadios[0].checked = true;
            }
        } else {
            modalTitle.innerText = '添加机器';
            btnSave.innerText = '添加';
            currentEditingId = null;
        }

        updateCharCount(inputName, nameCount, 30);
        updateCharCount(inputRemark, remarkCount, 50);
        
        // 初始化验证方式显示
        toggleAuthMethod();
        
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            if (inputName) setTimeout(() => inputName.focus(), 50);
        }
    }

    function closeModal() { if (modalOverlay) modalOverlay.classList.add('hidden'); currentEditingId = null; }
    if (btnNewSession) btnNewSession.addEventListener('click', () => openModal(false));
    if (tabAddBtn) tabAddBtn.addEventListener('click', () => openModal(false)); // 绑定 + 号按钮
    closeButtons.forEach(b => b.addEventListener('click', closeModal));

    // 测试连接按钮逻辑 - 只针对SSH服务器模态框中的按钮
    const btnTestConnect = document.querySelector('#modal-overlay .btn-test-connect');
    if (btnTestConnect) {
        btnTestConnect.addEventListener('click', async () => {
            const host = inputHost.value.trim();
            if (!host) {
                showToast('请输入 Host 地址');
                inputHost.style.borderColor = '#ef4444';
                setTimeout(() => inputHost.style.borderColor = '', 2000);
                return;
            }
            // 验证IP地址格式
            if (!validateIP(host)) {
                showToast('IP地址格式不正确，请输入有效的IP地址或域名');
                inputHost.style.borderColor = '#ef4444';
                setTimeout(() => inputHost.style.borderColor = '', 2000);
                return;
            }

            // 构造临时测试数据
            const authMethod = document.querySelector('input[name="auth-method"]:checked').value;
            const testData = {
                host: host,
                port: parseInt(inputPort.value) || 22,
                user: inputUser.value || 'root',
                auth: authMethod
            };

            // 根据验证方式添加相应的认证信息
            if (authMethod === 'password') {
                testData.password = inputPassword.value;
            } else if (authMethod === 'key') {
                testData.keyPath = inputKeyPath.value;
                testData.keyPassphrase = inputKeyPassphrase.value;
                if (inputKeyFile.fileContent) {
                    testData.keyContent = inputKeyFile.fileContent;
                }
            }

            // UI Loading State
            const originalText = btnTestConnect.innerHTML;
            btnTestConnect.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 连接中...';
            btnTestConnect.disabled = true;
            btnTestConnect.style.opacity = '0.7';

            try {
                const result = await apiTestConnection(testData);
                if (result.success) {
                    showToast('连接成功');
                    btnTestConnect.innerHTML = '<i class="fa-solid fa-check"></i> 连接成功';
                    btnTestConnect.style.color = '#10b981';
                } else {
                    alert('连接失败: ' + result.message);
                    btnTestConnect.innerHTML = originalText;
                    btnTestConnect.style.color = '';
                }
            } catch (e) {
                alert('系统错误: ' + e);
                btnTestConnect.innerHTML = originalText;
            } finally {
                // 3秒后恢复按钮状态（如果是成功的话）
                setTimeout(() => {
                    btnTestConnect.disabled = false;
                    btnTestConnect.style.opacity = '1';
                    if (btnTestConnect.innerText.includes('成功')) {
                        btnTestConnect.innerHTML = originalText;
                        btnTestConnect.style.color = '';
                    }
                }, 3000);
            }
        });
    }

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const name = inputName.value || inputHost.value;
            const host = inputHost.value.trim();
            if (!host) {
                inputHost.style.borderColor = '#ef4444';
                setTimeout(() => inputHost.style.borderColor = '', 2000);
                showToast('请输入 Host 地址');
                return;
            }
            // 验证IP地址格式
            if (!validateIP(host)) {
                inputHost.style.borderColor = '#ef4444';
                setTimeout(() => inputHost.style.borderColor = '', 2000);
                showToast('IP地址格式不正确，请输入有效的IP地址或域名');
                return;
            }

            const authMethod = document.querySelector('input[name="auth-method"]:checked').value;
            const serverData = {
                name: name, host: host, port: parseInt(inputPort.value) || 22,
                user: inputUser.value, auth: authMethod, remark: inputRemark.value,
            };

            // 根据验证方式添加相应的认证信息
            if (authMethod === 'password') {
                serverData.password = inputPassword.value;
            } else if (authMethod === 'key') {
                serverData.keyPath = inputKeyPath.value;
                serverData.keyPassphrase = inputKeyPassphrase.value;
                if (inputKeyFile.fileContent) {
                    serverData.keyContent = inputKeyFile.fileContent;
                }
            }

            if (currentEditingId) {
                apiUpdateServer(currentEditingId, serverData).then(() => {
                    fetchServers();
                    tabs.updateTabTitle(currentEditingId, name);
                });
            } else {
                apiSaveServer(serverData).then(() => fetchServers());
            }
            closeModal();
        });
    }

    // 初始化
    function init() {
        // 平滑显示内容，避免加载时的跳动
        // 使用双重 requestAnimationFrame 确保样式已完全应用
        const showContent = () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const appContainer = document.querySelector('.app-container');
                    if (appContainer) {
                        appContainer.classList.add('loaded');
                    }
                    document.body.classList.add('loaded');
                });
            });
        };

        // 如果文档已完全加载，立即显示
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            // 延迟一点确保样式已应用
            setTimeout(showContent, 100);
        } else {
            // 等待窗口加载完成
            window.addEventListener('load', () => {
                setTimeout(showContent, 100);
            });
        }

        if (window.pywebview) {
            fetchServers();
            // 检查应用锁状态
            setTimeout(() => {
                if (typeof checkLock === 'function') {
                    checkLock();
                }
            }, 200);
        } else {
            window.addEventListener('pywebviewready', () => {
                fetchServers();
                // 检查应用锁状态
                setTimeout(() => {
                    if (typeof checkLock === 'function') {
                        checkLock();
                    }
                }, 200);
            });
        }


        document.body.classList.remove('glass-mode'); // Cleanup old class if any

        // --- Reset App Logic ---
        const btnResetApp = document.getElementById('btn-reset-app');
        if (btnResetApp) {
            btnResetApp.addEventListener('click', () => {
                if (confirm('确定要重置所有数据吗？这将清除所有服务器配置和设置，且无法恢复！')) {
                    localStorage.clear();
                    // Optional: clear backend data if needed via API
                    // window.pywebview.api.reset_data(); 
                    window.location.reload();
                }
            });
        }

        // Theme Init - 4个选项：实体深色、实体亮色、毛玻璃亮色、毛玻璃暗色
        const savedTheme = localStorage.getItem('theme') || 'solid-dark'; // Default to solid-dark
        // 兼容旧版本：将旧的 theme 和 appearanceMode 组合转换为新格式
        let currentTheme = savedTheme;
        if (savedTheme === 'solid' || savedTheme === 'acrylic') {
            const savedMode = localStorage.getItem('appearanceMode') || localStorage.getItem('appMode') || 'dark';
            if (savedTheme === 'solid') {
                currentTheme = savedMode === 'light' ? 'solid-light' : 'solid-dark';
            } else {
                currentTheme = 'acrylic-dark'; // 只保留毛玻璃暗色
            }
            localStorage.setItem('theme', currentTheme);
        }
        
        if (themeSelect) {
            themeSelect.value = currentTheme;
            themeSelect.addEventListener('change', async (e) => {
                const theme = e.target.value;
                localStorage.setItem('theme', theme);
                await saveSettingToFile('theme', theme);
                applyTheme(theme);
                showToast('主题已保存');
            });
        }

        // Initial Apply
        applyTheme(currentTheme);

        // 延迟检查应用锁，确保tabs对象已创建
        // 只在应用锁开启时才检查
        const isLocked = localStorage.getItem('isLocked') === 'true';
        if (isLocked) {
            setTimeout(() => {
                if (typeof checkLock === 'function') {
                    checkLock();
                }
            }, 200);
        } else {
            // 确保锁屏被隐藏
            if (lockScreen) lockScreen.classList.add('hidden');
            if (dashboardContainer) {
                dashboardContainer.style.pointerEvents = '';
                dashboardContainer.style.opacity = '';
            }
        }

        // 初始化自动锁定计时器
        resetAutoLockTimer();
    }

    function updateThemeOptions() {
        // 不再需要动态更新选项，所有4个选项始终可用
    }

    // --- 主题切换 ---
    function syncTitleBar() {
        if (!window.pywebview) return;
        const isSolid = document.body.classList.contains('solid-mode');
        const isLight = document.body.classList.contains('light-mode');
        let theme = 'glass_dark';
        if (isSolid) {
            theme = isLight ? 'light' : 'dark';
        } else {
            theme = isLight ? 'glass_light' : 'glass_dark';
        }
        window.pywebview.api.set_titlebar_theme(theme);
    }

    function applyTheme(theme) {
        // 添加过渡动画
        document.body.style.transition = 'background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Remove old classes
        document.body.classList.remove('solid-mode', 'light-mode');

        // 根据主题值设置对应的类和模式
        if (theme === 'solid-dark') {
            document.body.classList.add('solid-mode');
            // dark mode is default, no need to add light-mode
        } else if (theme === 'solid-light') {
            document.body.classList.add('solid-mode', 'light-mode');
        } else if (theme === 'acrylic-dark') {
            // acrylic dark is default (no classes needed)
        } else {
            // 兼容旧版本：如果传入的是 'solid' 或 'acrylic'，根据当前模式判断
            const currentMode = document.body.classList.contains('light-mode') ? 'light' : 'dark';
            if (theme === 'solid') {
                document.body.classList.add('solid-mode');
                if (currentMode === 'light') {
                    document.body.classList.add('light-mode');
                }
            } else {
                // acrylic - 只支持暗色模式
            }
        }

        syncTitleBar();
    }

    // --- 数据导出 ---
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataStr = JSON.stringify(servers, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fishell_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // --- 数据导入 ---
    if (btnImport && fileImport) {
        btnImport.addEventListener('click', () => fileImport.click());
        fileImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    if (Array.isArray(json)) {
                        if (confirm(`准备导入 ${json.length} 个服务器数据，这将覆盖当前列表。确定吗？`)) {
                            await window.pywebview.api.import_servers(json);
                            alert('导入成功！');
                            fetchServers();
                        }
                    } else {
                        alert('文件格式错误：必须是服务器数组 JSON');
                    }
                } catch (err) {
                    alert('解析 JSON 失败：' + err.message);
                }
                fileImport.value = ''; // 重置，允许重复导入同一文件
            };
            reader.readAsText(file);
        });
    }

    // --- Editor & File Actions Logic ---
    const modalEditor = document.getElementById('modal-editor-overlay');
    const editorFilename = document.getElementById('editor-filename');
    const editorContent = document.getElementById('editor-content');
    const btnSaveFile = document.getElementById('btn-save-file');
    const closeEditorBtns = document.querySelectorAll('.close-editor');

    let currentEditFile = null;

    function openEditor(serverId, path, filename) {
        if (!modalEditor) return;
        currentEditFile = { serverId, path, filename };
        if (editorFilename) editorFilename.innerText = filename;
        if (editorContent) {
            editorContent.value = "加载中...";
            editorContent.disabled = true;
        }
        modalEditor.classList.remove('hidden');

        apiSftpRead(serverId, path).then(res => {
            if (!editorContent) return;
            if (res.success) {
                editorContent.value = res.content;
                editorContent.disabled = false;
                editorContent.focus();
            } else {
                editorContent.value = `无法读取文件: ${res.message}`;
            }
        });
    }

    if (closeEditorBtns) {
        closeEditorBtns.forEach(btn => btn.addEventListener('click', () => {
            modalEditor.classList.add('hidden');
            currentEditFile = null;
        }));
    }

    if (btnSaveFile) {
        btnSaveFile.addEventListener('click', () => {
            if (!currentEditFile) return;
            const content = editorContent.value;
            const btnContent = btnSaveFile.innerHTML;
            btnSaveFile.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 保存中...';
            btnSaveFile.disabled = true;

            apiSftpSave(currentEditFile.serverId, currentEditFile.path, content).then(res => {
                btnSaveFile.innerHTML = btnContent;
                btnSaveFile.disabled = false;
                if (res.success) {
                    // showToast('保存成功');
                    modalEditor.classList.add('hidden');
                } else {
                    alert(`保存失败: ${res.message}`);
                }
            });
        });
    }

    // Ctrl+S
    if (editorContent) {
        editorContent.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                btnSaveFile.click();
            }
        });
    }

    const modalFileActions = document.getElementById('modal-file-actions-overlay');
    const closeFileActionsBtns = document.querySelectorAll('.close-file-actions');
    const btnActionEdit = document.getElementById('action-edit');
    const btnActionDownload = document.getElementById('action-download');
    const btnActionDelete = document.getElementById('action-delete');
    const fileActionsTitle = document.getElementById('file-actions-title');

    let currentActionFile = null;

    function showFileActions(serverId, path, filename, isDir, onSuccess) {
        if (!modalFileActions) return;
        currentActionFile = { serverId, path, filename, isDir, onSuccess };
        if (fileActionsTitle) fileActionsTitle.innerText = filename;

        if (isDir) {
            if (btnActionEdit) btnActionEdit.style.display = 'none';
            if (btnActionDownload) btnActionDownload.style.display = 'none';
        } else {
            if (btnActionEdit) btnActionEdit.style.display = 'flex';
            if (btnActionDownload) btnActionDownload.style.display = 'flex';
        }

        modalFileActions.classList.remove('hidden');
    }

    if (modalFileActions) {
        const closeActions = () => {
            modalFileActions.classList.add('hidden');
            currentActionFile = null;
        };
        closeFileActionsBtns.forEach(btn => btn.onclick = closeActions);
        modalFileActions.onclick = (e) => {
            if (e.target === modalFileActions) closeActions();
        };

        if (btnActionEdit) btnActionEdit.onclick = () => {
            if (!currentActionFile || currentActionFile.isDir) return;
            closeActions();
            openEditor(currentActionFile.serverId, currentActionFile.path, currentActionFile.filename);
        };

        if (btnActionDownload) btnActionDownload.onclick = () => {
            if (!currentActionFile || currentActionFile.isDir) return;
            closeActions();
            apiSftpDownload(currentActionFile.serverId, currentActionFile.path);
        };

        if (btnActionDelete) btnActionDelete.onclick = () => {
            if (!currentActionFile) return;
            closeActions();
            apiSftpDelete(currentActionFile.serverId, currentActionFile.path, currentActionFile.isDir).then((success) => {
                if (success && currentActionFile.onSuccess) currentActionFile.onSuccess();
            });
        };
    }

    // --- 软件更新检测 ---
    const btnCheckUpdate = document.getElementById('btn-check-update');
    const btnDownloadUpdate = document.getElementById('btn-download-update');
    const versionStatus = document.getElementById('version-status');
    const currentVersionEl = document.getElementById('current-version');
    const updateInfoRow = document.getElementById('update-info-row');
    const newVersionEl = document.getElementById('new-version');
    const releaseNotesEl = document.getElementById('release-notes');
    const downloadProgressRow = document.getElementById('download-progress-row');
    const downloadProgress = document.getElementById('download-progress');
    const downloadStatus = document.getElementById('download-status');

    // 右下角更新通知元素
    const updateToast = document.getElementById('update-toast');
    const updateCurrentVer = document.getElementById('update-current-ver');
    const updateNewVer = document.getElementById('update-new-ver');
    const updateNotesContent = document.getElementById('update-notes-content');
    const updateDownloadProgress = document.getElementById('update-download-progress');
    const updateProgressBar = document.getElementById('update-progress-bar');
    const updateProgressText = document.getElementById('update-progress-text');
    const btnUpdateLater = document.getElementById('btn-update-later');
    const btnUpdateNow = document.getElementById('btn-update-now');
    const btnUpdateClose = document.getElementById('btn-update-close');

    let updateInfo = null;
    let currentAppVersion = '1.2.0';

    // 初始化时获取当前版本
    async function initVersion() {
        if (window.pywebview && window.pywebview.api) {
            try {
                const version = await window.pywebview.api.get_app_version();
                currentAppVersion = version;
                if (currentVersionEl) currentVersionEl.textContent = version;
            } catch (e) {
                console.error('获取版本失败:', e);
            }
        }
    }

    // 显示更新通知
    function showUpdateToast(result) {
        if (!updateToast) return;
        
        updateInfo = result;
        if (updateNewVer) updateNewVer.textContent = result.latest_version;
        if (updateNotesContent) updateNotesContent.textContent = result.release_notes || '• 修复已知问题\n• 性能优化';
        
        // 重置下载进度
        if (updateDownloadProgress) updateDownloadProgress.classList.add('hidden');
        if (updateProgressBar) updateProgressBar.style.width = '0%';
        if (btnUpdateNow) {
            btnUpdateNow.disabled = false;
            btnUpdateNow.innerHTML = '<i class="fa-solid fa-download"></i><span>更新</span>';
        }
        if (btnUpdateLater) btnUpdateLater.style.display = '';
        
        updateToast.classList.remove('hidden');
    }

    // 关闭更新通知
    function closeUpdateToast() {
        if (updateToast) updateToast.classList.add('hidden');
    }

    // 检查更新（静默模式用于启动时自动检查）
    // 检查更新（静默模式用于启动时自动检查）
    async function checkForUpdate(silent = false) {
        if (!window.pywebview || !window.pywebview.api) {
            if (!silent) showToast('无法连接到更新服务', 'error');
            return;
        }

        // 添加旋转动画（仅手动检查时）
        if (!silent && btnCheckUpdate) {
            btnCheckUpdate.classList.add('checking');
            btnCheckUpdate.disabled = true;
        }

        try {
            const result = await window.pywebview.api.check_update();
            
            if (result.success) {
                if (result.needs_update) {
                    // 有新版本 - 显示右下角通知
                    showUpdateToast(result);
                    
                    // 同时更新设置页面的显示
                    if (versionStatus) versionStatus.textContent = '发现新版本';
                    if (newVersionEl) newVersionEl.textContent = result.latest_version;
                    if (releaseNotesEl) releaseNotesEl.textContent = result.release_notes || '暂无更新说明';
                    if (updateInfoRow) updateInfoRow.classList.remove('hidden');
                    if (btnDownloadUpdate) {
                        btnDownloadUpdate.classList.remove('hidden');
                        btnDownloadUpdate.innerHTML = `<i class="fa-solid fa-download"></i> 下载 v${result.latest_version}`;
                    }
                } else {
                    // 已是最新版本
                    if (versionStatus) versionStatus.textContent = '当前版本 (已是最新)';
                    if (updateInfoRow) updateInfoRow.classList.add('hidden');
                    if (btnDownloadUpdate) btnDownloadUpdate.classList.add('hidden');
                    if (!silent) showToast('已是最新版本');
                }
            } else {
                if (!silent) showToast(result.error || '检查更新失败', 'error');
            }
        } catch (e) {
            console.error('检查更新失败:', e);
            if (!silent) showToast('检查更新失败', 'error');
        } finally {
            if (btnCheckUpdate) {
                btnCheckUpdate.classList.remove('checking');
                btnCheckUpdate.disabled = false;
            }
        }
    }

    // 从通知下载更新
    async function downloadUpdateFromToast() {
        if (!updateInfo || !updateInfo.download_url) {
            showToast('没有可用的更新', 'error');
            return;
        }

        // 更新按钮状态
        if (btnUpdateNow) {
            btnUpdateNow.disabled = true;
            btnUpdateNow.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        }
        if (btnUpdateLater) btnUpdateLater.style.display = 'none';

        // 显示进度条
        if (updateDownloadProgress) updateDownloadProgress.classList.remove('hidden');

        try {
            // 模拟下载进度
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                if (updateProgressBar) updateProgressBar.style.width = progress + '%';
                if (updateProgressText) updateProgressText.textContent = Math.round(progress) + '%';
            }, 500);

            const result = await window.pywebview.api.download_update(updateInfo.download_url);
            
            clearInterval(progressInterval);

            if (result.success) {
                if (updateProgressBar) updateProgressBar.style.width = '100%';
                if (updateProgressText) updateProgressText.textContent = '100%';
                if (btnUpdateNow) btnUpdateNow.innerHTML = '<i class="fa-solid fa-check"></i>';
                
                // 安装更新
                setTimeout(async () => {
                    const installResult = await window.pywebview.api.install_update(result.filepath);
                    if (!installResult.success) {
                        showToast('安装失败: ' + installResult.error, 'error');
                        resetToastDownloadUI();
                    }
                }, 1000);
            } else {
                showToast('下载失败: ' + result.error, 'error');
                resetToastDownloadUI();
            }
        } catch (e) {
            console.error('下载更新失败:', e);
            showToast('下载失败', 'error');
            resetToastDownloadUI();
        }
    }

    function resetToastDownloadUI() {
        if (btnUpdateNow) {
            btnUpdateNow.disabled = false;
            btnUpdateNow.innerHTML = '<i class="fa-solid fa-download"></i><span>更新</span>';
        }
        if (btnUpdateLater) btnUpdateLater.style.display = '';
        if (updateDownloadProgress) updateDownloadProgress.classList.add('hidden');
        if (updateProgressBar) updateProgressBar.style.width = '0%';
    }

    // 下载更新（设置页面）
    async function downloadUpdate() {
        if (!updateInfo || !updateInfo.download_url) {
            showToast('没有可用的更新', 'error');
            return;
        }

        if (btnDownloadUpdate) {
            btnDownloadUpdate.disabled = true;
            btnDownloadUpdate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 准备下载...';
        }

        if (downloadProgressRow) downloadProgressRow.classList.remove('hidden');
        if (downloadProgress) downloadProgress.style.width = '0%';
        if (downloadStatus) downloadStatus.textContent = '正在下载...';

        try {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                if (downloadProgress) downloadProgress.style.width = progress + '%';
                if (downloadStatus) downloadStatus.textContent = `正在下载... ${Math.round(progress)}%`;
            }, 500);

            const result = await window.pywebview.api.download_update(updateInfo.download_url);
            
            clearInterval(progressInterval);

            if (result.success) {
                if (downloadProgress) downloadProgress.style.width = '100%';
                if (downloadStatus) downloadStatus.textContent = '下载完成，正在安装...';
                
                setTimeout(async () => {
                    const installResult = await window.pywebview.api.install_update(result.filepath);
                    if (!installResult.success) {
                        showToast('安装失败: ' + installResult.error, 'error');
                        resetDownloadUI();
                    }
                }, 1000);
            } else {
                showToast('下载失败: ' + result.error, 'error');
                resetDownloadUI();
            }
        } catch (e) {
            console.error('下载更新失败:', e);
            showToast('下载失败', 'error');
            resetDownloadUI();
        }
    }

    function resetDownloadUI() {
        if (btnDownloadUpdate) {
            btnDownloadUpdate.disabled = false;
            btnDownloadUpdate.innerHTML = `<i class="fa-solid fa-download"></i> 下载更新`;
        }
        if (downloadProgressRow) downloadProgressRow.classList.add('hidden');
    }

    // 绑定更新通知事件
    if (btnUpdateClose) btnUpdateClose.addEventListener('click', closeUpdateToast);
    if (btnUpdateLater) btnUpdateLater.addEventListener('click', closeUpdateToast);
    if (btnUpdateNow) btnUpdateNow.addEventListener('click', downloadUpdateFromToast);

    // 绑定设置页面事件
    if (btnCheckUpdate) btnCheckUpdate.addEventListener('click', () => checkForUpdate(false));
    if (btnDownloadUpdate) btnDownloadUpdate.addEventListener('click', downloadUpdate);

    // --- 公告功能 ---
    const navNotice = document.getElementById('nav-notice');
    // noticeContainer 已在顶部声明
    const noticePageTitle = document.getElementById('notice-page-title');
    const noticePageContent = document.getElementById('notice-page-content');
    const noticePageTime = document.getElementById('notice-page-time');

    let noticeData = null;

    async function loadNotice() {
        if (!window.pywebview || !window.pywebview.api) return;
        try {
            const result = await window.pywebview.api.get_notice();
            if (result.success && result.has_notice) {
                noticeData = result;
                // 显示侧边栏公告导航
                if (navNotice) navNotice.classList.remove('hidden');
                // 更新公告页面内容
                if (noticePageTitle) noticePageTitle.textContent = result.title || '公告';
                if (noticePageContent) {
                    noticePageContent.innerHTML = result.content || '';
                    // 让所有链接在外部浏览器打开
                    noticePageContent.querySelectorAll('a').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const url = link.href;
                            if (url && window.pywebview && window.pywebview.api.open_browser) {
                                window.pywebview.api.open_browser(url);
                            } else if (url) {
                                window.open(url, '_blank');
                            }
                        });
                    });
                }
                if (noticePageTime && result.updated_at) {
                    noticePageTime.textContent = '更新时间: ' + result.updated_at;
                }
            } else {
                if (navNotice) navNotice.classList.add('hidden');
            }
        } catch (e) {
            console.error('获取公告失败:', e);
        }
    }

    // 绑定公告导航事件
    if (navNotice) {
        navNotice.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.openNotice();
        });
    }

    // 启动时自动检查更新和加载公告（延迟2秒，静默模式）
    setTimeout(async () => {
        await initVersion();
        // 加载公告
        loadNotice();
        // 检查是否在锁屏状态，锁屏时不显示更新通知
        const isLocked = localStorage.getItem('isLocked') === 'true';
        if (!isLocked) {
            checkForUpdate(true); // 静默检查，有更新才显示通知
        }
    }, 2000);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
});
