document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    // Get user ID from URL (e.g., ?userId=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    if (!userId) {
        alert('No user specified');
        window.location.href = 'chats.html';
        return;
    }

    const backBtn = document.getElementById('back-btn');
    const chatsNav = document.getElementById('chats-nav');
    const profileNav = document.getElementById('profile-nav');
    const avatar = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('name-display');
    const aboutEl = document.getElementById('about-display');
    const phoneEl = document.getElementById('phone-display');

    try {
        const data = await apiCall(`/users/${userId}`, 'GET', null, token);
        const user = data.user;
        avatar.src = user.profilePic && user.profilePic !== 'default-avatar.png'
            ? `http://localhost:3000${user.profilePic}`
            : 'assets/default-avatar.png';
        nameEl.textContent = user.name || 'Unknown';
        aboutEl.textContent = user.about || 'Hey there! I\'m using MiChat';
        phoneEl.textContent = user.phone || 'No phone';
    } catch (err) {
        alert('Failed to load user profile: ' + err.message);
    }

    // Navigation
    backBtn.addEventListener('click', () => {
        window.location.href = 'chats.html';
    });
    chatsNav.addEventListener('click', () => {
        window.location.href = 'chats.html';
    });
    profileNav.addEventListener('click', () => {
        window.location.href = 'profile.html';
    });
});