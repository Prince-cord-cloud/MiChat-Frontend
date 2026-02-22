document.addEventListener('DOMContentLoaded', () => {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    const nameInput = document.getElementById('name');
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarImg = document.getElementById('avatar-img');

    let currentPhone = '';
    let currentEmail = '';
    let countdownInterval;

    // Theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
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

    // ==================== BUTTON DISABLE HELPER ====================
    async function withButton(button, asyncFn) {
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Please wait...';
        try {
            await asyncFn();
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // Step 1: Check phone
    const checkPhoneBtn = document.getElementById('check-phone-btn');
    checkPhoneBtn.addEventListener('click', (e) => withButton(e.currentTarget, async () => {
        const phone = phoneInput.value.trim();
        if (!phone) {
            showError('phone-error', 'Phone required');
            return;
        }
        try {
            const data = await checkPhone(phone);
            currentPhone = data.phone;
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
        } catch (err) {
            showError('phone-error', err.message);
            throw err; // rethrow to ensure finally runs
        }
    }));

    // Step 2: Send OTP
    const sendOtpBtn = document.getElementById('send-otp-btn');
    sendOtpBtn.addEventListener('click', (e) => withButton(e.currentTarget, async () => {
        const email = emailInput.value.trim();
        if (!email) {
            showError('email-error', 'Email required');
            return;
        }
        try {
            await sendOtp(currentPhone, email);
            currentEmail = email;
            document.getElementById('otp-email-display').textContent = email;
            step2.classList.add('hidden');
            step3.classList.remove('hidden');
            startCountdown(300);
        } catch (err) {
            showError('email-error', err.message);
            throw err;
        }
    }));

    // Step 3: Verify OTP
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    verifyOtpBtn.addEventListener('click', (e) => withButton(e.currentTarget, async () => {
        const otp = otpInput.value.trim();
        if (!otp || otp.length !== 6) {
            showError('otp-error', 'Enter 6-digit OTP');
            return;
        }
        try {
            const data = await verifyOtp(currentPhone, currentEmail, otp);
            const token = data.token;
            localStorage.setItem('token', token);
            if (data.user.isNewUser) {
                step3.classList.add('hidden');
                step4.classList.remove('hidden');
            } else {
                window.location.href = 'chats.html';
            }
        } catch (err) {
            showError('otp-error', err.message);
            throw err;
        }
    }));

    // Resend OTP (already disabled during countdown, but we add extra protection)
    const resendOtpBtn = document.getElementById('resend-otp-btn');
    resendOtpBtn.addEventListener('click', (e) => withButton(e.currentTarget, async () => {
        try {
            await resendOtp(currentPhone, currentEmail);
            startCountdown(300);
        } catch (err) {
            showError('otp-error', err.message);
            throw err;
        }
    }));

    // Back buttons (no async, no need to disable)
    document.getElementById('back-to-phone').addEventListener('click', () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
    });
    document.getElementById('back-to-email').addEventListener('click', () => {
        step3.classList.add('hidden');
        step2.classList.remove('hidden');
        clearInterval(countdownInterval);
    });

    // Save profile
    const saveProfileBtn = document.getElementById('save-profile-btn');
    saveProfileBtn.addEventListener('click', (e) => withButton(e.currentTarget, async () => {
        const name = nameInput.value.trim() || 'MiChat User';
        const token = localStorage.getItem('token');
        try {
            await updateProfile(token, { name });
            if (avatarUpload.files[0]) {
                const formData = new FormData();
                formData.append('profilePic', avatarUpload.files[0]);
                await uploadProfilePic(token, formData);
            }
            window.location.href = 'chats.html';
        } catch (err) {
            showError('profile-error', err.message);
            throw err;
        }
    }));

    // Avatar preview
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => avatarImg.src = e.target.result;
            reader.readAsDataURL(file);
        }
    });

    function showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    function startCountdown(seconds) {
        const countdownSpan = document.getElementById('countdown');
        const resendBtn = document.getElementById('resend-otp-btn');
        resendBtn.disabled = true;
        countdownSpan.textContent = seconds;
        countdownInterval = setInterval(() => {
            seconds--;
            countdownSpan.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                resendBtn.disabled = false;
                countdownSpan.textContent = '0';
            }
        }, 1000);
    }
});