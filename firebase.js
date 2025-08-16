<!-- firebase.js -->
<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
// (Optional) App Check to reduce abuse:
// import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-check.js";

async function loadFirebaseConfig() {
  const res = await fetch("/.netlify/functions/firebase-config", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load Firebase config");
  return res.json();
}

const cfg = await loadFirebaseConfig();
export const firebaseApp = initializeApp(cfg);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Optional App Check (create a site key in Firebase → App Check):
// const appCheck = initializeAppCheck(firebaseApp, {
//   provider: new ReCaptchaV3Provider("YOUR_RECAPTCHA_V3_SITE_KEY"),
//   isTokenAutoRefreshEnabled: true,
// });
</script>