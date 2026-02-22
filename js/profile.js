document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    // Determine backend base URL based on frontend environment
    const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://michat-backend-0i2m.onrender.com';

    // DOM elements
    const backBtn = document.getElementById('back-btn');
    const editBtn = document.getElementById('edit-btn');
    const saveBtn = document.getElementById('save-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const nameDisplay = document.getElementById('name-display');
    const aboutDisplay = document.getElementById('about-display');
    const phoneDisplay = document.getElementById('phone-display');
    const emailDisplay = document.getElementById('email-display');
    const nameInput = document.getElementById('name-input');
    const aboutInput = document.getElementById('about-input');
    const avatarImg = document.getElementById('profile-avatar');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    const chatsNav = document.getElementById('chats-nav');
    const profileNav = document.getElementById('profile-nav');

    let currentUser = {};

    // Load user data
    async function loadProfile() {
        try {
            const data = await getMe(token);
            currentUser = data.user;
            renderProfile();
        } catch (err) {
            console.error('Failed to load profile', err);
            alert('Error loading profile. Redirecting to login.');
            logout();
        }
    }

    function renderProfile() {
        nameDisplay.textContent = currentUser.name || 'Your Name';
        aboutDisplay.textContent = currentUser.about || 'Hey there! I\'m using MiChat';
        phoneDisplay.textContent = currentUser.phone || 'Unknown';
        emailDisplay.textContent = currentUser.email || 'Unknown';
        if (currentUser.profilePic && currentUser.profilePic !== 'default-avatar.png') {
            avatarImg.src = BASE_URL + currentUser.profilePic;
        } else {
            avatarImg.src = 'assets/default-avatar.png';
        }
        nameInput.value = currentUser.name || '';
        aboutInput.value = currentUser.about || '';
    }

    // Edit mode
    editBtn.addEventListener('click', () => {
        nameDisplay.classList.add('hidden');
        aboutDisplay.classList.add('hidden');
        nameInput.classList.remove('hidden');
        aboutInput.classList.remove('hidden');
        editBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
    });

    // Save changes
    saveBtn.addEventListener('click', async () => {
        const newName = nameInput.value.trim();
        const newAbout = aboutInput.value.trim();
        try {
            await updateProfile(token, { name: newName, about: newAbout });
            currentUser.name = newName;
            currentUser.about = newAbout;
            renderProfile();
            // Exit edit mode
            nameDisplay.classList.remove('hidden');
            aboutDisplay.classList.remove('hidden');
            nameInput.classList.add('hidden');
            aboutInput.classList.add('hidden');
            editBtn.classList.remove('hidden');
            saveBtn.classList.add('hidden');
            alert('Profile updated!');
        } catch (err) {
            alert('Update failed: ' + err.message);
        }
    });

    // Change avatar
    changeAvatarBtn.addEventListener('click', () => {
        avatarUpload.click();
    });

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
                avatarImg.src = BASE_URL + data.profilePic;
                currentUser.profilePic = data.profilePic;
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (err) {
            alert('Avatar upload failed: ' + err.message);
        }
    });

    // Logout
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = 'auth.html';
    }

    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });

    // Navigation
    backBtn.addEventListener('click', () => {
        window.location.href = 'chats.html';
    });
    chatsNav.addEventListener('click', () => {
        window.location.href = 'chats.html';
    });
    profileNav.addEventListener('click', () => {
        // Already on profile page – could scroll to top or refresh
        window.location.reload();
    });

    // Initial load
    await loadProfile();
});