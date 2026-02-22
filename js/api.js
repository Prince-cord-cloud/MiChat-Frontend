const API_BASE = 'http://localhost:3000/api';

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
}

// Auth endpoints
async function checkPhone(phone, countryCode = '234') {
    return apiCall('/auth/check-phone', 'POST', { phone, countryCode });
}
async function sendOtp(phone, email) {
    return apiCall('/auth/send-otp', 'POST', { phone, email });
}
async function verifyOtp(phone, email, otp) {
    return apiCall('/auth/verify-otp', 'POST', { phone, email, otp });
}
async function resendOtp(phone, email) {
    return apiCall('/auth/resend-otp', 'POST', { phone, email });
}

// User endpoints (authenticated)
async function getMe(token) {
    return apiCall('/users/me', 'GET', null, token);
}
async function updateProfile(token, data) {
    return apiCall('/users/profile', 'PUT', data, token);
}
async function uploadProfilePic(token, formData) {
    const res = await fetch(`${API_BASE}/users/profile-pic`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    return res.json();
}

// Chat endpoints
async function getConversations(token) {
    return apiCall('/chats', 'GET', null, token);
}
async function getOrCreatePrivateChat(token, targetUserId) {
    return apiCall('/chats/private', 'POST', { targetUserId }, token);
}
async function getMessages(token, conversationId) {
    return apiCall(`/messages/${conversationId}`, 'GET', null, token);
}
async function sendTextMessage(token, conversationId, text) {
    return apiCall('/messages/text', 'POST', { conversationId, text }, token);
}

// Contact discovery
async function matchContacts(token, hashedNumbers) {
    return apiCall('/contacts/match', 'POST', { hashedNumbers }, token);
}
// Get user by phone
async function getUserByPhone(token, phone) {
    return apiCall(`/users/phone/${encodeURIComponent(phone)}`, 'GET', null, token);
}