import { auth, db } from '/js/auth.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '/js/shared.js';

// Note: Page protection/redirection is handled in shared.js

const loginForm = document.getElementById('login-form');
const googleLoginBtn = document.getElementById('google-login-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const loginErrorElement = document.getElementById('login-error');
const authSuccessElement = document.getElementById('auth-success');

// Email/Password Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
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

// Google Login
googleLoginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then(async (result) => {
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                name: user.displayName, email: user.email, profilePhotoUrl: user.photoURL,
                role: 'seller', isVerified: false, referralCount: 0, createdAt: serverTimestamp(),
                referralCode: user.uid.substring(0, 6).toUpperCase(), badges: []
            });
        }
        // Redirect will be handled by shared.js
    }).catch((error) => {
        showMessage(loginErrorElement, "Could not sign in with Google. Please try again.");
    });
});

// Forgot Password
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    if (!email) return showMessage(loginErrorElement, "Please enter your email to reset your password.");
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage(authSuccessElement, "Password reset email sent. Please check your inbox.", false);
    } catch (error) {
        showMessage(loginErrorElement, "Could not send reset email. Make sure the email is correct.");
    }
});

// Password Toggle Visibility
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        const passwordInput = e.target.closest('.password-wrapper').querySelector('input');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text'; e.target.textContent = '🙈';
        } else {
            passwordInput.type = 'password'; e.target.textContent = '👁️';
        }
    });
});