<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hostels & Rentals in Kabale | Kabale Online</title>
    <meta name="description" content="Find the best student hostels, rentals, and rooms for rent in Kabale.">
    <link rel="icon" href="../favicon.webp" type="image/webp">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="../styles.css">
    <style>
        :root {
            --primary-color: #007bff; --accent-color: #ffc107; --bg-color: #f0f5fa;
            --card-bg: #ffffff; --text-dark: #34495e; --border-color: #dee2e6;
            --border-radius: 8px; --shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background-color: var(--bg-color); color: var(--text-dark); padding-top: 60px; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 15px; }
        .page-container { padding-top: 20px; padding-bottom: 20px; }
        .sticky-header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background-color: var(--card-bg); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .header-top-bar { display: flex; justify-content: space-between; align-items: center; padding: 0 15px; height: 60px; }
        .hamburger-menu { font-size: 24px; background: none; border: none; cursor: pointer; color: var(--text-dark); }
        .site-title { text-decoration: none; color: var(--text-dark); font-size: 1.6em; font-weight: bold; }
        .site-title span { color: var(--accent-color); }
        .mobile-nav { display: none; background-color: var(--card-bg); position: absolute; top: 100%; left: 0; right: 0; z-index: 999; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-top: 1px solid var(--border-color); }
        .mobile-nav.active { display: block; }
        .mobile-nav a { display: block; padding: 15px; text-decoration: none; color: var(--text-dark); border-bottom: 1px solid var(--border-color); }
        .section-box { background-color: var(--card-bg); padding: 25px; margin-bottom: 25px; border-radius: var(--border-radius); box-shadow: var(--shadow); border: 1px solid var(--border-color); text-align: center; }
        .back-to-home-link { display: inline-block; margin-bottom: 20px; padding: 8px 16px; background-color: #e9ecef; color: var(--text-dark); text-decoration: none; font-weight: 600; border-radius: 20px; }
        .form-group { margin-bottom: 18px; text-align: left; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 6px; color: #495057; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; box-sizing: border-box; }
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 15px; }
        .amenities-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px; background-color: #f8f9fa; padding: 15px; border-radius: 6px; }
        .auth-tabs { display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 20px; }
        .tab-link { flex: 1; padding: 12px; background: none; border: none; cursor: pointer; font-size: 1em; font-weight: 600; color: #6c757d; border-bottom: 3px solid transparent; transition: all 0.2s ease-in-out; }
        .tab-link.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .auth-container[data-active-tab="login"] .login-card { border-top: 4px solid var(--primary-color); }
        .auth-container[data-active-tab="signup"] .login-card { border-top: 4px solid var(--accent-color); }
        .error-message, .success-message { text-align: center; }
        .loader { width: 18px; height: 18px; border: 2px solid #FFF; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; margin-right: 8px; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .auth-button.loading, .cta-button:disabled { opacity: 0.7; cursor: not-allowed; }
        .hostel-grid { display: grid; gap: 20px; grid-template-columns: 1fr; margin-top: 20px; }
        .hostel-card { background-color: var(--card-bg); border-radius: var(--border-radius); overflow: hidden; box-shadow: var(--shadow); color: inherit; }
        .hostel-card-image { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background-color: #eee; }
        .hostel-card-content { padding: 15px; text-align: left; }
        .hostel-card-footer { padding: 15px; background-color: #f8f9fa; border-top: 1px solid var(--border-color); text-align: center; }
        .contact-link { font-size: 1.1em; font-weight: bold; color: var(--primary-color); text-decoration: none; cursor: pointer; }
        footer { background-color: var(--text-dark); color: white; padding: 40px 20px; text-align: center; margin-top: 30px; }
        .kabale-footer-links { margin-bottom: 20px; }
        .kabale-footer-link { color: #bdc3c7; margin: 0 10px; text-decoration: none; }
        @media (min-width: 768px) { .hostel-grid { grid-template-columns: repeat(2, 1fr); } .form-grid { grid-template-columns: 1fr 1fr; } }
    </style>
</head>
<body>
    <header class="sticky-header">
        <!-- Header content -->
    </header>

    <div class="container page-container">
        <a href="/" class="back-to-home-link"><i class="fa-solid fa-arrow-left"></i> Back to Home</a>
        
        <div id="dashboard-container" class="section-box" style="display: none;">
            <!-- Landlord Dashboard will appear here when logged in -->
        </div>

        <div id="initial-view">
            <div class="section-box">
                 <h2>Landlords & Agents</h2>
                 <p>Post your vacant rentals and hostels here to reach students and residents in Kabale.</p>
                 <button id="show-auth-btn" class="cta-button">Post a Rental (Login/Sign Up)</button>
                 <div id="auth-container" style="display: none; margin-top: 20px;" data-active-tab="login">
                    <div class="auth-tabs">
                        <button class="tab-link active" data-tab="login-tab">Login</button>
                        <button class="tab-link" data-tab="signup-tab">Sign Up</button>
                    </div>
                    <div id="login-tab" class="tab-content active"><form id="login-form">...</form></div>
                    <div id="signup-tab" class="tab-content"><form id="signup-form">...</form></div>
                 </div>
            </div>
        </div>

        <h2 id="public-listings-title" style="text-align:center; margin-top:30px;">Available Hostels & Rentals</h2>
        <div id="hostel-grid-public" class="hostel-grid"></div>
    </div>
    
    <footer>
        <!-- Footer content -->
    </footer>
    
    <script type="module" src="../ui.js"></script>
    <script type="module" src="hostels.js"></script>
</body>
</html>