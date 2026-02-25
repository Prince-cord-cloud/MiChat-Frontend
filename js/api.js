// Determine backend base URL based on frontend environment
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://michat-backend-0i2m.onrender.com';

const API_BASE = BASE_URL + '/api';

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
        return data;
    } catch (error) {
        // Network error (e.g., server unreachable, CORS)
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Unable to reach the server. Please check your internet connection or try again later.');
        }
        // Re-throw other errors (already formatted)
        throw error;
    }
}

// Auth endpoints (unchanged)
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

// User endpoints
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
}

// Chat endpoints (unchanged)
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
async function getUserByPhone(token, phone) {
    return apiCall(`/users/phone/${encodeURIComponent(phone)}`, 'GET', null, token);
}