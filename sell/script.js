// PASTE YOUR SUPABASE URL AND ANON KEY FROM STEP 1.3 HERE
const SUPABASE_URL = 'https://cefajxqufyxdjxtdolib.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZmFqeHF1Znl4ZGp4dGRvbGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4ODA1MjYsImV4cCI6MjA2OTQ1NjUyNn0.osP7p2SWj1ZM4V4XmYnN0Y1Q_ZSvNlmnRAa0Iiaj6Yo';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authContainer = document.getElementById('auth-container');
const sellContainer = document.getElementById('sell-container');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');
const userEmailDisplay = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const sellForm = document.getElementById('sell-form');
const submitBtn = document.getElementById('submit-btn');
const feedbackMessage = document.getElementById('feedback-message');

// --- AUTHENTICATION LOGIC ---
supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
        authContainer.classList.add('hidden');
        sellContainer.classList.remove('hidden');
        userEmailDisplay.textContent = session.user.email;
    } else {
        authContainer.classList.remove('hidden');
        sellContainer.classList.add('hidden');
    }
});

function toggleViews() {
    loginView.classList.toggle('hidden');
    signupView.classList.toggle('hidden');
    authError.textContent = '';
}

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) authError.textContent = error.message;
    else authError.textContent = 'Check your email for a confirmation link!';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) authError.textContent = error.message;
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// --- PRODUCT SUBMISSION LOGIC ---
sellForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        feedbackMessage.textContent = 'You must be logged in.';
        return;
    }

    submitBtn.disabled = true;
    feedbackMessage.textContent = 'Submitting, please wait...';
    feedbackMessage.style.color = '#333';
    
    const imageFile = document.getElementById('product-image').files[0];
    if (!imageFile) {
        feedbackMessage.textContent = 'Please select an image file.';
        feedbackMessage.style.color = 'red';
        submitBtn.disabled = false;
        return;
    }

    try {
        // 1. Upload image to Supabase Storage
        const filePath = `public/${Date.now()}_${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, imageFile);
        if (uploadError) throw uploadError;

        // 2. Get the public URL of the uploaded image
        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
        
        // 3. Insert product data into the Supabase database
        const { error: insertError } = await supabase.from('products').insert({
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: Number(document.getElementById('product-price').value),
            whatsapp: document.getElementById('whatsapp-number').value,
            imageUrl: urlData.publicUrl,
            ownerId: user.id // Link the product to the logged-in user
        });
        if (insertError) throw insertError;

        feedbackMessage.textContent = 'Success! Your item is now live.';
        feedbackMessage.style.color = 'green';
        sellForm.reset();

    } catch (error) {
        console.error('Error submitting product:', error);
        feedbackMessage.textContent = `An error occurred: ${error.message}`;
        feedbackMessage.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
    }
});
