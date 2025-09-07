import { auth, db } from './firebase.js';
import {
    GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, onAuthStateChanged, signOut,
    sendPasswordResetEmail, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- ELEMENT SELECTION (These elements are on BOTH sell.html and hostels.html) ---
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const googleLoginBtn = document.getElementById('google-login-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const loginErrorElement = document.getElementById('login-error');
const signupErrorElement = document.getElementById('signup-error');
const authSuccessElement = document.getElementById('auth-success');
const emailVerificationPrompt = document.getElementById('email-verification-prompt');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const verificationLogoutBtn = document.getElementById('verification-logout-btn');

// --- HELPER FUNCTIONS ---
const showMessage = (element, message, isError = true) => {
    if (!element) return;
    element.textContent = message;
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
};
const hideAuthMessages = () => {
    if(loginErrorElement) loginErrorElement.style.display = 'none';
    if(signupErrorElement) signupErrorElement.style.display = 'none';
    if(authSuccessElement) authSuccessElement.style.display = 'none';
};
const clearAuthForms = () => {
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
};
const toggleLoading = (button, isLoading, originalText) => {
    if(!button) return;
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = `<span class="loader"></span> ${originalText}`;
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        button.innerHTML = originalText;
    }
};
function normalizeWhatsAppNumber(phone) {
    if(!phone) return '';
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned;
}

// --- MAIN AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await user.reload();
        if (user.emailVerified) {
            if (authContainer) authContainer.style.display = 'none';
            if (emailVerificationPrompt) emailVerificationPrompt.style.display = 'none';
            if (dashboardContainer) dashboardContainer.style.display = 'block';
            if (sellerEmailSpan) sellerEmailSpan.textContent = user.email;
        } else {
            if (authContainer) authContainer.style.display = 'none';
            if (dashboardContainer) dashboardContainer.style.display = 'none';
            if (emailVerificationPrompt) {
                emailVerificationPrompt.style.display = 'block';
                const userEmailEl = emailVerificationPrompt.querySelector('.user-email');
                if (userEmailEl) userEmailEl.textContent = user.email;
            }
        }
    } else {
        if (authContainer) authContainer.style.display = 'block';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
        if (emailVerificationPrompt) emailVerificationPrompt.style.display = 'none';
    }
});

// --- EVENT LISTENERS FOR AUTH FORMS ---
if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAuthMessages();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginButton = loginForm.querySelector('button[type="submit"]');
        toggleLoading(loginButton, true, 'Logging In');
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => {
                showMessage(loginErrorElement, 'Invalid email or password.');
            })
            .finally(() => {
                toggleLoading(loginButton, false, 'Login');
            });
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthMessages();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const whatsapp = document.getElementById('signup-whatsapp')?.value;
        const location = document.getElementById('signup-location')?.value;
        const institution = document.getElementById('signup-institution')?.value;
        const referralCode = document.getElementById('referral-code')?.value.trim().toUpperCase();
        const signupButton = signupForm.querySelector('button[type="submit"]');
        const signupPatienceMessage = document.getElementById('signup-patience-message');

        toggleLoading(signupButton, true, 'Creating Account');
        if (signupPatienceMessage) signupPatienceMessage.style.display = 'block';
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            let referrerId = null;
            if (referralCode) {
                const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    referrerId = querySnapshot.docs[0].id;
                    await updateDoc(doc(db, 'users', referrerId), { referralCount: increment(1) });
                }
            }
            
            const userData = {
                name, email, role: 'seller', isVerified: false, 
                createdAt: serverTimestamp(), referralCount: 0, referrerId,
                referralCode: user.uid.substring(0, 6).toUpperCase()
            };
            if(whatsapp) userData.whatsapp = normalizeWhatsAppNumber(whatsapp);
            if(location) userData.location = location;
            if(institution) userData.institution = institution;
            
            await setDoc(doc(db, "users", user.uid), userData);
            await sendEmailVerification(user);
            showMessage(authSuccessElement, "Success! Please check your email to verify your account.", false);
            signupForm.reset();
        } catch (error) {
            let msg = 'An error occurred. Please try again.';
            if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
            if (error.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
            showMessage(signupErrorElement, msg);
        } finally {
            toggleLoading(signupButton, false, 'Create Account');
            if (signupPatienceMessage) signupPatienceMessage.style.display = 'none';
        }
    });
}

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
        hideAuthMessages();
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((error) => {
            showMessage(loginErrorElement, "Could not sign in with Google. Please try again.");
        });
    });
}

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault(); hideAuthMessages();
        const email = document.getElementById('login-email').value;
        if (!email) { return showMessage(loginErrorElement, "Please enter your email to reset your password."); }
        try {
            await sendPasswordResetEmail(auth, email);
            showMessage(authSuccessElement, "Password reset email sent. Please check your inbox.", false);
        } catch (error) {
            showMessage(loginErrorElement, "Could not send reset email. Make sure the email is correct.");
        }
    });
}

if (resendVerificationBtn) {
    resendVerificationBtn.addEventListener('click', async () => {
        toggleLoading(resendVerificationBtn, true, 'Sending');
        try {
            await sendEmailVerification(auth.currentUser);
            showMessage(authSuccessElement, "A new verification email has been sent.", false);
        } catch (error) {
            showMessage(authSuccessElement, "Failed to send email. Please try again soon.", true);
        } finally {
            toggleLoading(resendVerificationBtn, false, 'Resend Verification Email');
        }
    });
}

if (verificationLogoutBtn) {
    verificationLogoutBtn.addEventListener('click', () => signOut(auth));
}

const tabs = document.querySelectorAll('.tab-link');
const contents = document.querySelectorAll('.tab-content');
if (tabs.length > 0) {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            hideAuthMessages();
            clearAuthForms();
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        const passwordInput = e.target.closest('.password-wrapper').querySelector('input');
        if (passwordInput.type === 'password') { passwordInput.type = 'text'; e.target.textContent = '🙈'; }
        else { passwordInput.type = 'password'; e.target.textContent = '👁️'; }
    });
});