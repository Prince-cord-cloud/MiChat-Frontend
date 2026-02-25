document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('auth.html');
        return;
    }

    // Determine backend base URL based on frontend environment
    const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://michat-backend-0i2m.onrender.com';

    const WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'ws://localhost:3000'
        : 'wss://michat-backend-0i2m.onrender.com';

    // DOM elements
    const chatListEl = document.getElementById('chat-list');
    const messagesContainer = document.getElementById('messages-container');
    const chatNameEl = document.getElementById('chat-name');
    const chatStatusEl = document.getElementById('chat-status');
    const chatAvatar = document.getElementById('chat-avatar');
    const sendBtn = document.getElementById('send-message-btn');
    const messageInput = document.getElementById('message-text');
    const backToList = document.getElementById('back-to-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const contactsModal = document.getElementById('contacts-modal');
    const closeModal = document.querySelector('.close-btn');
    const searchBtn = document.getElementById('search-contact-btn');
    const searchPhone = document.getElementById('search-phone');
    const searchResult = document.getElementById('search-result');
    const profileNav = document.getElementById('profile-nav');
    const chatsNav = document.getElementById('chats-nav');
    const newChatNav = document.getElementById('new-chat-nav');
    if (newChatNav) {
        newChatNav.addEventListener('click', () => {
            contactsModal.classList.remove('hidden');
            searchPhone.value = '';
            searchResult.innerHTML = '';
        });
    }

    // Profile view elements
    const chatListView = document.getElementById('chat-list-view');
    const profileView = document.getElementById('profile-view');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileNameDisplay = document.getElementById('profile-name-display');
    const profileAboutDisplay = document.getElementById('profile-about-display');
    const profilePhoneDisplay = document.getElementById('profile-phone-display');
    const profileEmailDisplay = document.getElementById('profile-email-display');
    const profileNameInput = document.getElementById('profile-name-input');
    const profileAboutInput = document.getElementById('profile-about-input');
    const profileEditBtn = document.getElementById('profile-edit-btn');
    const profileSaveBtn = document.getElementById('profile-save-btn');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    // Profile settings elements
    const profileSettingsBtn = document.getElementById('profile-settings-btn');
    const profileSettingsModal = document.getElementById('profile-settings-modal');
    const settingsClose = document.getElementById('settings-close');
    const settingsSave = document.getElementById('settings-save');
    const settingsCancel = document.getElementById('settings-cancel');
    const settingNotifications = document.getElementById('setting-notifications');
    const settingReadReceipts = document.getElementById('setting-read-receipts');
    const settingDeliveryReceipts = document.getElementById('setting-delivery-receipts');

    // Context menu (chat item)
    const contextMenu = document.getElementById('context-menu');
    const contextViewProfile = document.getElementById('context-view-profile');
    const contextDeleteChat = document.getElementById('context-delete-chat');
    const contextMenuClose = document.getElementById('context-menu-close');
    let selectedChatItem = null;

    // Contact info modal
    const contactInfoModal = document.getElementById('contact-info-modal');
    const closeContactInfo = document.getElementById('close-contact-info');
    const contactInfoAvatar = document.getElementById('contact-info-avatar');
    const contactInfoName = document.getElementById('contact-info-name');
    const contactInfoPhone = document.getElementById('contact-info-phone');
    const contactInfoAbout = document.getElementById('contact-info-about');
    const contactInfoEmail = document.getElementById('contact-info-email');
    const contactInfoDeleteChat = document.getElementById('contact-info-delete-chat');
    const contactInfoClose = document.getElementById('contact-info-close');

    // Message actions modal
    const messageActionsModal = document.getElementById('message-actions-modal');
    const actionCopy = document.getElementById('action-copy');
    const actionDelete = document.getElementById('action-delete');
    const actionEdit = document.getElementById('action-edit');
    let selectedMessageElement = null;
    let selectedMessageData = null;

    // Theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        });
    }

    // ==================== SEARCH STATE ====================
    let searchTerm = '';
    const searchInput = document.getElementById('search-chat-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.trim().toLowerCase();
            renderChatList();
        });
    }

    let currentConversationId = null;
    let currentOtherUserId = null;  // Track the other participant for presence updates
    let conversations = [];
    let socket = null;
    let currentUser = null;
    // Settings stored locally; persisted to localStorage under 'michat_settings'
    let settings = {
        notifications: true,
        readReceipts: true,
        deliveryReceipts: true
    };

    function loadSettings() {
        try {
            const raw = localStorage.getItem('michat_settings');
            if (raw) {
                const parsed = JSON.parse(raw);
                settings = Object.assign(settings, parsed);
            }
        } catch (e) {
            console.warn('Failed to load settings', e);
        }
        // Reflect in UI if elements exist
        if (settingNotifications) settingNotifications.checked = !!settings.notifications;
        if (settingReadReceipts) settingReadReceipts.checked = !!settings.readReceipts;
        if (settingDeliveryReceipts) settingDeliveryReceipts.checked = !!settings.deliveryReceipts;
    }

    function saveSettingsToStorage() {
        try {
            localStorage.setItem('michat_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings', e);
        }
    }

    /// ==================== LOADER FUNCTIONS ====================
    function showLoader(element) {
        element.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
    }

    // ==================== LOAD CONVERSATIONS ====================
    async function loadConversations() {
        showLoader(chatListEl);
        try {
            const data = await getConversations(token);
            // Ensure each conversation has an _id field (backend should return _id)
            conversations = data.conversations || [];
            renderChatList();
        } catch (err) {
            chatListEl.innerHTML = '<div class="empty-state">Failed to load conversations</div>';
            console.error('Failed to load conversations', err);
        }
    }

    // ==================== TOGGLE VIEW ====================
    function showChatList() {
        chatListView.classList.remove('hidden');
        profileView.classList.add('hidden');
        chatsNav.classList.add('active');
        profileNav.classList.remove('active');
        searchTerm = '';
        if (searchInput) searchInput.value = '';
        renderChatList();
    }

    function showProfile() {
        chatListView.classList.add('hidden');
        profileView.classList.remove('hidden');
        profileNav.classList.add('active');
        chatsNav.classList.remove('active');
        loadProfileData();
    }

    if (chatsNav) chatsNav.addEventListener('click', showChatList);
    if (profileNav) profileNav.addEventListener('click', showProfile);

    // ==================== PROFILE FUNCTIONS ====================
    async function loadProfileData() {
        try {
            const data = await getMe(token);
            currentUser = data.user;
            renderProfile();
        } catch (err) {
            console.error('Failed to load profile', err);
        }
    }

    function renderProfile() {
        profileNameDisplay.textContent = currentUser.name || 'Your Name';
        profileAboutDisplay.textContent = currentUser.about || 'Hey there! I\'m using MiChat';
        profilePhoneDisplay.textContent = currentUser.phone || 'Unknown';
        profileEmailDisplay.textContent = currentUser.email || 'Unknown';
        if (currentUser.profilePic && currentUser.profilePic !== '/assets/default-avatar.jpg') {
            profileAvatar.src = BASE_URL + currentUser.profilePic;
        } else {
            profileAvatar.src = 'assets/default-avatar.jpg';
        }
        profileNameInput.value = currentUser.name || '';
        profileAboutInput.value = currentUser.about || '';
    }

    // Edit profile
    if (profileEditBtn) {
        profileEditBtn.addEventListener('click', () => {
            profileNameDisplay.classList.add('hidden');
            profileAboutDisplay.classList.add('hidden');
            profileNameInput.classList.remove('hidden');
            profileAboutInput.classList.remove('hidden');
            profileEditBtn.classList.add('hidden');
            profileSaveBtn.classList.remove('hidden');
        });
    }

    if (profileSaveBtn) {
        profileSaveBtn.addEventListener('click', async () => {
            const newName = profileNameInput.value.trim();
            const newAbout = profileAboutInput.value.trim();
            try {
                await updateProfile(token, { name: newName, about: newAbout });
                currentUser.name = newName;
                currentUser.about = newAbout;
                renderProfile();
                profileNameDisplay.classList.remove('hidden');
                profileAboutDisplay.classList.remove('hidden');
                profileNameInput.classList.add('hidden');
                profileAboutInput.classList.add('hidden');
                profileEditBtn.classList.remove('hidden');
                profileSaveBtn.classList.add('hidden');
                alert('Profile updated!');
            } catch (err) {
                alert('Update failed: ' + err.message);
            }
        });
    }

    // Change avatar
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarUpload.click();
        });
    }

    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('profilePic', file);
            try {
                const res = await fetch(`${BASE_URL}/api/users/profile-pic`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    profileAvatar.src = BASE_URL + data.profilePic;
                    currentUser.profilePic = data.profilePic;
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            } catch (err) {
                alert('Avatar upload failed: ' + err.message);
            }
        });
    }

    // Logout
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                window.location.replace('auth.html');
            }
        });
    }

    // Profile settings button handlers
    if (profileSettingsBtn) {
        profileSettingsBtn.addEventListener('click', () => {
            if (profileSettingsModal) {
                // ensure checkboxes reflect current settings
                if (settingNotifications) settingNotifications.checked = !!settings.notifications;
                if (settingReadReceipts) settingReadReceipts.checked = !!settings.readReceipts;
                if (settingDeliveryReceipts) settingDeliveryReceipts.checked = !!settings.deliveryReceipts;
                profileSettingsModal.classList.remove('hidden');
            }
        });
    }
    if (settingsClose) settingsClose.addEventListener('click', () => profileSettingsModal.classList.add('hidden'));
    if (settingsCancel) settingsCancel.addEventListener('click', () => profileSettingsModal.classList.add('hidden'));
    if (settingsSave) settingsSave.addEventListener('click', () => {
        // read checkboxes and persist
        settings.notifications = !!(settingNotifications && settingNotifications.checked);
        settings.readReceipts = !!(settingReadReceipts && settingReadReceipts.checked);
        settings.deliveryReceipts = !!(settingDeliveryReceipts && settingDeliveryReceipts.checked);
        saveSettingsToStorage();
        // request notification permission if enabling notifications
        if (settings.notifications && 'Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission().then(() => {});
        }
        profileSettingsModal.classList.add('hidden');
    });

    // ==================== CHAT LIST RENDER ====================
    function renderChatList() {
        if (!chatListEl) return;

        const currentUserId = localStorage.getItem('userId');

        let filtered = conversations;
        if (searchTerm) {
            filtered = conversations.filter(conv => 
                conv.name && conv.name.toLowerCase().includes(searchTerm)
            );
        }

        if (filtered.length === 0) {
            chatListEl.innerHTML = '<div class="empty-state">No chats match your search</div>';
            return;
        }

        chatListEl.innerHTML = filtered.map(conv => {
            const lastMsg = conv.lastMessage;
            let lastMessageText = lastMsg?.content?.text || 'No messages';
            let messagePrefix = '';

            // Add pink outgoing icon if the last message was sent by the current user
            if (lastMsg && lastMsg.senderId === currentUserId) {
                messagePrefix = '<i class="fas fa-arrow-right" style="color: var(--pink); margin-right: 4px;"></i>';
            }

            return `
                <div class="chat-item" data-conv-id="${conv._id}">
                    <img src="${conv.avatar ? BASE_URL + conv.avatar : 'assets/default-avatar.jpg'}" class="chat-avatar">
                    <div class="chat-info">
                        <div class="chat-name">${conv.name || 'Unknown'}</div>
                        <div class="last-message">
                            ${messagePrefix}
                            ${lastMessageText}
                        </div>
                    </div>
                    <div class="chat-meta">
                        <div>${conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                        ${conv.unreadCount ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
                    </div>
                    <button class="chat-menu-btn" data-conv-id="${conv._id}"><i class="fas fa-ellipsis-v"></i></button>
                </div>
            `;
        }).join('');

        console.log('Rendered chat items count:', document.querySelectorAll('.chat-item').length);

        // Attach click handlers to chat items (open conversation)
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Prevent opening conversation if the click was on the menu button
                if (e.target.closest('.chat-menu-btn')) return;
                const convId = item.dataset.convId;
                console.log('Chat item clicked, convId:', convId);
                openConversation(convId);
                if (window.innerWidth <= 768) {
                    document.getElementById('chat-history-panel').classList.add('show');
                }
            });
        });

        // Attach click handlers to menu buttons (open context menu)
        document.querySelectorAll('.chat-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent chat item click
                const convId = btn.dataset.convId;
                selectedChatItem = document.querySelector(`.chat-item[data-conv-id="${convId}"]`);
                contextMenu.classList.remove('hidden');
            });
        });
    }

    // Close context menu when clicking outside
    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.classList.contains('hidden') && !contextMenu.contains(e.target) && !e.target.closest('.chat-menu-btn')) {
            contextMenu.classList.add('hidden');
            selectedChatItem = null;
        }
    });

    // Close context menu when clicking the X
    if (contextMenuClose) {
        contextMenuClose.addEventListener('click', () => {
            if (contextMenu) contextMenu.classList.add('hidden');
            selectedChatItem = null;
        });
    }

    // Context menu button handlers
    if (contextViewProfile) {
        contextViewProfile.addEventListener('click', async () => {
            contextMenu.classList.add('hidden');
            if (!selectedChatItem) return;
            const convId = selectedChatItem.dataset.convId;
            const conv = conversations.find(c => (c._id && c._id.toString ? c._id.toString() : c._id) === convId);
            if (!conv) return;

            const currentUserId = localStorage.getItem('userId');
            let targetUserId = null;

            // Determine other participant's ID
            if (conv.participants && Array.isArray(conv.participants)) {
                const other = conv.participants.find(p => {
                    const pid = p._id ? p._id.toString() : p.toString();
                    return pid !== currentUserId;
                });
                targetUserId = other ? (other._id ? other._id.toString() : other.toString()) : null;
            } else if (conv.participantIds && Array.isArray(conv.participantIds)) {
                const other = conv.participantIds.find(id => id.toString() !== currentUserId);
                targetUserId = other ? other.toString() : null;
            } else if (conv.userId) {
                targetUserId = conv.userId.toString();
            } else if (conv.otherUserId) {
                targetUserId = conv.otherUserId.toString();
            } else if (conv.participantId) {
                targetUserId = conv.participantId.toString();
            }

            if (!targetUserId) {
                console.error('Could not identify contact. Conversation:', conv);
                alert('Could not identify contact. See console for details.');
                return;
            }

            try {
                const data = await apiCall(`/users/${targetUserId}`, 'GET', null, token);
                const user = data.user;
                contactInfoAvatar.src = user.profilePic && user.profilePic !== '/assets/default-avatar.jpg'
                    ? BASE_URL + user.profilePic
                    : 'assets/default-avatar.jpg';
                contactInfoName.textContent = user.name || 'Unknown';
                contactInfoPhone.textContent = user.phone;
                contactInfoAbout.textContent = user.about || 'Hey there! I\'m using MiChat';
                contactInfoEmail.textContent = user.email ? `Email: ${user.email}` : 'Email not provided';

                // Handle delete button inside contact modal (attach safely to current element)
                const freshDeleteBtn = document.getElementById('contact-info-delete-chat');
                if (freshDeleteBtn) {
                    freshDeleteBtn.onclick = () => {
                        contactInfoModal.classList.add('hidden');
                        if (selectedChatItem) {
                            const convId = selectedChatItem.dataset.convId;
                            if (confirm('Are you sure you want to delete this chat?')) {
                                conversations = conversations.filter(c => (c._id && c._id.toString ? c._id.toString() : c._id) !== convId);
                                renderChatList();
                                if (currentConversationId === convId) {
                                    currentConversationId = null;
                                    chatNameEl.textContent = 'Select a chat';
                                    chatAvatar.src = 'assets/default-avatar.jpg';
                                    messagesContainer.innerHTML = '';
                                }
                            }
                        }
                    };
                }

                if (contactInfoClose) {
                    contactInfoClose.addEventListener('click', () => {
                        contactInfoModal.classList.add('hidden');
                    });
                }

                contactInfoModal.classList.remove('hidden');
            } catch (err) {
                alert('Failed to load contact info: ' + err.message);
            }
        });
    }

    if (contextDeleteChat) {
        contextDeleteChat.addEventListener('click', () => {
            contextMenu.classList.add('hidden');
            if (!selectedChatItem) return;
            const convId = selectedChatItem.dataset.convId;
            if (confirm('Are you sure you want to delete this chat?')) {
                conversations = conversations.filter(c => (c._id && c._id.toString ? c._id.toString() : c._id) !== convId);
                renderChatList();
                if (currentConversationId === convId) {
                    currentConversationId = null;
                    chatNameEl.textContent = 'Select a chat';
                    chatAvatar.src = 'assets/default-avatar.jpg';
                    messagesContainer.innerHTML = '';
                }
            }
        });
    }

    // Close contact info modal (existing X button)
    if (closeContactInfo) {
        closeContactInfo.addEventListener('click', () => contactInfoModal.classList.add('hidden'));
    }
    if (contactInfoModal) {
        contactInfoModal.addEventListener('click', (e) => {
            if (e.target === contactInfoModal) contactInfoModal.classList.add('hidden');
        });
    }

    // ==================== MESSAGE ACTIONS MODAL ====================
    // Close modal when clicking outside
    if (messageActionsModal) {
        messageActionsModal.addEventListener('click', (e) => {
            if (e.target === messageActionsModal) {
                messageActionsModal.classList.add('hidden');
                if (selectedMessageElement) selectedMessageElement.classList.remove('selected');
            }
        });
        // Close when clicking outside the modal
        document.addEventListener('click', (e) => {
            if (messageActionsModal && !messageActionsModal.classList.contains('hidden') 
                && !messageActionsModal.contains(e.target) 
                && e.target !== selectedMessageElement) {
                messageActionsModal.classList.add('hidden');
                if (selectedMessageElement) selectedMessageElement.classList.remove('selected');
            }
        });
    }

    // Copy message - SINGLE listener
    if (actionCopy) {
        actionCopy.onclick = () => {
            if (selectedMessageData) {
                const text = selectedMessageData.content?.text || '';
                navigator.clipboard.writeText(text).then(() => {
                    // Show brief feedback
                    const originalText = actionCopy.textContent;
                    actionCopy.textContent = '✓ Copied!';
                    setTimeout(() => {
                        actionCopy.textContent = originalText;
                    }, 1000);
                }).catch(() => alert('Failed to copy'));
            }
            messageActionsModal.classList.add('hidden');
            if (selectedMessageElement) selectedMessageElement.classList.remove('selected');
        };
    }

    // Delete message - SINGLE listener with backend call
    if (actionDelete) {
        actionDelete.onclick = async () => {
            if (!selectedMessageData) return;
            if (confirm('Delete this message?')) {
                try {
                    // Call backend to delete message
                    await apiCall(`/messages/${selectedMessageData._id}`, 'DELETE', null, token);
                    
                    // Remove from UI
                    if (selectedMessageElement) {
                        selectedMessageElement.remove();
                    }
                    
                    // Reload messages to sync
                    if (currentConversationId) {
                        const data = await getMessages(token, currentConversationId);
                        renderMessages(data.messages);
                    }
                    
                    alert('Message deleted');
                } catch (err) {
                    alert('Failed to delete: ' + err.message);
                }
            }
            messageActionsModal.classList.add('hidden');
            if (selectedMessageElement) selectedMessageElement.classList.remove('selected');
        };
    }

    // ==================== MESSAGES ====================
    async function openConversation(convId) {
        currentConversationId = convId;
        const conv = conversations.find(c => (c._id && c._id.toString ? c._id.toString() : c._id) === convId);
        if (conv) {
            chatNameEl.textContent = conv.name || 'Chat';
            chatAvatar.src = conv.avatar ? BASE_URL + conv.avatar : 'assets/default-avatar.jpg';
            
            // Clear unread count locally and update chat list UI
            conv.unreadCount = 0;
            renderChatList();
            // Extract the other participant's ID for presence tracking
            const currentUserId = localStorage.getItem('userId');
            if (conv.participants && Array.isArray(conv.participants)) {
                const other = conv.participants.find(p => {
                    const pid = p._id ? p._id.toString() : p.toString();
                    return pid !== currentUserId;
                });
                currentOtherUserId = other ? (other._id ? other._id.toString() : other.toString()) : null;
            }
            
            showLoader(messagesContainer);
            try {
                const data = await getMessages(token, convId);
                renderMessages(data.messages || []);
                if (socket) {
                    // Join the conversation room
                    socket.emit('conversation:join', { conversationId: convId });
                    // Subscribe to contact's presence
                    if (currentOtherUserId) {
                        socket.emit('presence:subscribe', { targetUserId: currentOtherUserId });
                    }
                    if (settings.readReceipts) {
                        socket.emit('conversation:read', { conversationId: convId });
                    }
                    // ensure local state also cleared
                    conv.unreadCount = 0;
                    renderChatList();
                }
            } catch (err) {
                messagesContainer.innerHTML = '<div class="empty-state">Failed to load messages</div>';
                console.error('Failed to load messages', err);
            }
        }
    }

    function renderMessages(messages) {
        window.lastMessages = messages;
        const currentUserId = localStorage.getItem('userId');
        messagesContainer.innerHTML = messages.map(msg => {
            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
            const isOutgoing = senderId === currentUserId;
            let statusHtml = '';
            if (isOutgoing) {
                const status = msg.status || { sent: true };
                if (status.read) {
                    statusHtml = `<i class="fas fa-check-double" style="color: #1100ff; font-size: 12px; margin-left: 5px;" title="Read"></i>`;
                } else if (status.delivered) {
                    statusHtml = `<i class="fas fa-check-double" style="color: #03ff3a; font-size: 12px; margin-left: 5px;" title="Delivered"></i>`;
                } else {
                    statusHtml = `<i class="fas fa-check" style="color: #8e8e93; font-size: 12px; margin-left: 5px;" title="Sent"></i>`;
                }
            }
            return `
                <div class="message ${isOutgoing ? 'outgoing' : 'incoming'}" data-message-id="${msg._id}">
                    <div class="text">${msg.content?.text || ''}</div>
                    <div class="timestamp">
                        ${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        ${statusHtml}
                    </div>
                </div>
            `;
        }).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        attachMessageListeners();
    }

    function attachMessageListeners() {
        document.querySelectorAll('.message').forEach(msgEl => {
            let pressTimer;
            const startPress = (e) => {
                e.preventDefault();
                pressTimer = setTimeout(() => {
                    const msgId = msgEl.dataset.messageId;
                    const msg = window.lastMessages?.find(m => m._id === msgId);
                    if (!msg) return;

                    selectedMessageElement = msgEl;
                    selectedMessageData = msg;

                    // Highlight the message
                    document.querySelectorAll('.message').forEach(m => m.classList.remove('selected'));
                    msgEl.classList.add('selected');

                    const currentUserId = localStorage.getItem('userId');
                    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                    
                    // Show delete button only if user is the sender
                    if (senderId === currentUserId) {
                        actionDelete.classList.remove('hidden');
                    } else {
                        actionDelete.classList.add('hidden');
                    }

                    // Position modal relative to message
                    const rect = msgEl.getBoundingClientRect();
                    const scrollX = window.scrollX || window.pageXOffset;
                    const scrollY = window.scrollY || window.pageYOffset;
                    messageActionsModal.style.left = (rect.left + scrollX + rect.width / 2 - 70) + 'px';
                    messageActionsModal.style.top = (rect.top + scrollY - 60) + 'px';
                    
                    messageActionsModal.classList.remove('hidden');
                }, 500);
            };
            const cancelPress = () => clearTimeout(pressTimer);
            msgEl.addEventListener('mousedown', startPress);
            msgEl.addEventListener('touchstart', startPress);
            msgEl.addEventListener('mouseup', cancelPress);
            msgEl.addEventListener('touchend', cancelPress);
            msgEl.addEventListener('mouseleave', cancelPress);
        });
    }

    // Send message
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const text = messageInput.value.trim();
            if (!text || !currentConversationId) return;
            try {
                await sendTextMessage(token, currentConversationId, text);
                messageInput.value = '';
                const data = await getMessages(token, currentConversationId);
                renderMessages(data.messages);
            } catch (err) {
                alert('Failed to send: ' + err.message);
            }
        });
    }

    // Back to list (mobile)
    if (backToList) {
        backToList.addEventListener('click', () => {
            document.getElementById('chat-history-panel').classList.remove('show');
        });
    }

    // ==================== NEW CHAT MODAL ====================
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            contactsModal.classList.remove('hidden');
            searchPhone.value = '';
            searchResult.innerHTML = '';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => contactsModal.classList.add('hidden'));
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const phone = searchPhone.value.trim();
            if (!phone) {
                alert('Please enter a phone number');
                return;
            }
            searchResult.innerHTML = '<div class="loading">Searching...</div>';
            try {
                const data = await getUserByPhone(token, phone);
                const user = data.user;
                searchResult.innerHTML = `
                    <div class="contact-result-item" data-user-id="${user._id}">
                        <img src="${user.profilePic && user.profilePic !== '/assets/default-avatar.jpg' ? BASE_URL + user.profilePic : 'assets/default-avatar.jpg'}" alt="avatar">
                        <div class="info">
                            <div class="name">${user.name || 'Unknown'}</div>
                            <div class="phone">${user.phone}</div>
                        </div>
                        <button class="start-chat-btn">Chat</button>
                    </div>
                `;
                document.querySelector('.start-chat-btn').addEventListener('click', () => startChat(user._id));
            } catch (err) {
                if (err.message.includes('User not found')) {
                    searchResult.innerHTML = '<div class="not-found">❌ User not registered. Invite them to MiChat!</div>';
                } else {
                    searchResult.innerHTML = '<div class="not-found">Error: ' + err.message + '</div>';
                }
            }
        });
    }

    async function startChat(targetUserId) {
        try {
            const data = await getOrCreatePrivateChat(token, targetUserId);
            const conversation = data.conversation;
            const exists = conversations.find(c => c._id === conversation._id);
            if (!exists) {
                await loadConversations();
            }
            openConversation(conversation._id);
            contactsModal.classList.add('hidden');
            if (window.innerWidth <= 768) {
                document.getElementById('chat-history-panel').classList.add('show');
            }
        } catch (err) {
            alert('Failed to start chat: ' + err.message);
        }
    }

    // ==================== INIT ====================
    try {
        const me = await getMe(token);
        currentUser = me.user;
        localStorage.setItem('userId', me.user.id);
        // Load persisted user settings
        loadSettings();
    } catch (err) {
        console.error('Failed to get user ID', err);
    }

    await loadConversations();

    // ==================== WEBSOCKET ====================
    if (typeof io !== 'undefined') {
        socket = io(WS_URL, { auth: { token } });
        socket.on('connect', () => console.log('✅ WebSocket connected'));

        socket.on('message:receive', (data) => {
            console.log('📩 Received message via WS:', data);
            const msg = data.message;
            // Use string comparison to avoid type mismatches
            if (msg.conversationId?.toString() === currentConversationId?.toString()) {
                getMessages(token, currentConversationId).then(res => renderMessages(res.messages));
            } else {
                // Update local unread count so badge appears immediately
                const convIdStr = msg.conversationId?.toString();
                const conv = conversations.find(c => (c._id && c._id.toString ? c._id.toString() : c._id) === convIdStr);
                if (conv) {
                    conv.unreadCount = (conv.unreadCount || 0) + 1;
                    renderChatList();
                } else {
                    loadConversations();
                }
            }
            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
            // Desktop notification for backgrounded pages
            try {
                const currentUserId = localStorage.getItem('userId');
                if (senderId !== currentUserId && settings.notifications && document.hidden) {
                    const conv = conversations.find(c => (c._id && c._id.toString ? c._id.toString() : c._id) === (msg.conversationId?.toString()));
                    const title = conv ? conv.name || 'MiChat' : 'MiChat';
                    const body = msg.content?.text || 'New message';
                    if ("Notification" in window && Notification.permission === 'granted') {
                        new Notification(title, { body });
                    }
                }
            } catch (e) { console.warn('Notification failed', e); }

            if (senderId !== localStorage.getItem('userId') && settings.deliveryReceipts) {
                socket.emit('receipt:delivered', {
                    messageId: msg._id,
                    conversationId: msg.conversationId
                });
            }
        });

        socket.on('receipt:delivered', (data) => {
            const el = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
            if (el && el.classList.contains('outgoing')) {
                const ts = el.querySelector('.timestamp');
                ts.innerHTML = ts.innerHTML.replace(/<i class="fas fa-check[^>]*><\/i>/, '<i class="fas fa-check-double" style="color: #8e8e93; font-size: 12px;"></i>');
            }
        });

        socket.on('receipt:read', (data) => {
            const el = document.querySelector(`.message[data-message-id="${data.messageId}"]`);
            if (el && el.classList.contains('outgoing')) {
                const ts = el.querySelector('.timestamp');
                ts.innerHTML = ts.innerHTML.replace(/<i class="fas fa-check[^>]*><\/i>/, '<i class="fas fa-check-double" style="color: #ff69b4; font-size: 12px;"></i>');
            }
        });

        socket.on('presence:online', (data) => {
            if (data.userId === currentOtherUserId) {
                chatStatusEl.textContent = 'online';
            }
        });
        socket.on('presence:offline', (data) => {
            if (data.userId === currentOtherUserId) {
                const lastSeen = data.lastSeen ? new Date(data.lastSeen).toLocaleString() : 'recently';
                chatStatusEl.textContent = `last seen ${lastSeen}`;
            }
        });
    } else {
        console.warn('Socket.io not loaded');
    }
});