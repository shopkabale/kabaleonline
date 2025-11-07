// =================================================================== //
//                                                                     //
//             KABALE ONLINE - STORE EDITOR (create.js)                //
//         Preserves your original logic + added contact/template     //
//                                                                     //
// =================================================================== //

/* eslint-disable no-unused-vars */

// Imports from your *existing* firebase.js file (keep as before)
import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ---------------- DOM refs (container + templates) -----------------
const container = document.getElementById('store-create-container');
const loadingSpinner = document.getElementById('loading-spinner');
const loginTemplate = document.getElementById('login-placeholder');
const formTemplate = document.getElementById('form-template');

let currentUser = null;

// Keep a small local store for preview
const PREVIEW = {
  bannerUrl: '',
  avatarUrl: '',
  themeColor: '',
  font: '',
  layout: '',
  storeName: '',
  storeDesc: '',
  links: {}
};

// ------------ AUTH CHECK (unchanged pattern) -----------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadPage(user);
  } else {
    currentUser = null;
    const loginNode = loginTemplate.content.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(loginNode);
  }
});

// ----------------- LOAD FORM & WIRE FUNCTIONS ---------------------
async function loadPage(user) {
  const formNode = formTemplate.content.cloneNode(true);
  container.innerHTML = '';
  container.appendChild(formNode);

  // Query DOM after template appended
  const storeForm = document.getElementById('storeForm');
  const profileImageInput = document.getElementById('storeProfileImageFile');
  const profileImagePreview = document.getElementById('profileImagePreview');
  const bannerImageInput = document.getElementById('storeBannerFile');
  const bannerImagePreview = document.getElementById('bannerImagePreview');

  const navButtons = container.querySelectorAll('.nav-button');
  const formSections = container.querySelectorAll('.form-section');

  // PREVIEW elements
  const previewBanner = document.getElementById('previewBanner');
  const previewAvatar = document.getElementById('previewAvatar');
  const previewStoreName = document.getElementById('previewStoreName');
  const previewStoreDesc = document.getElementById('previewStoreDesc');
  const previewContact = document.getElementById('previewContact');
  const previewWhats = document.getElementById('previewWhats');
  const previewFB = document.getElementById('previewFB');
  const previewTT = document.getElementById('previewTT');
  const previewPanel = document.getElementById('previewPanel');
  const mapIframe = document.getElementById('mapIframe');

  // CONTACT inputs
  const storeTel = document.getElementById('storeTel');
  const storeLocation = document.getElementById('storeLocation');
  const hoursList = document.getElementById('hoursList');
  const addHourBtn = document.getElementById('addHourBtn');

  // TEMPLATE inputs
  const themeColorInput = document.getElementById('storeThemeColor');
  const themeFontInput = document.getElementById('storeThemeFont');
  const layoutSelect = document.getElementById('storeLayout');
  const previewApplyBtn = document.getElementById('previewApplyBtn');
  const previewResetBtn = document.getElementById('previewResetBtn');

  // LINKS
  const linkWhatsapp = document.getElementById('linkWhatsapp');
  const linkFacebook = document.getElementById('linkFacebook');
  const linkTiktok = document.getElementById('linkTiktok');
  const linkGithub = document.getElementById('linkGithub');

  // message and save
  const messageBox = document.getElementById('messageBox');
  const saveButton = document.getElementById('saveButton');

  // wire nav scroll (preserve existing logic + enhanced active)
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = button.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // IntersectionObserver for active nav highlight (enhanced)
  const observerOptions = { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 };
  const observerCallback = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const activeSectionId = entry.target.id;
        navButtons.forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('href') === `#${activeSectionId}`);
        });
      }
    });
  };
  const observer = new IntersectionObserver(observerCallback, observerOptions);
  formSections.forEach(section => observer.observe(section));

  // Image preview handlers (kept from your earlier code)
  profileImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        profileImagePreview.src = ev.target.result;
        profileImagePreview.style.display = 'block';
        PREVIEW.avatarUrl = ev.target.result;
        previewAvatar.src = PREVIEW.avatarUrl;
      };
      reader.readAsDataURL(file);
    }
  });
  bannerImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        bannerImagePreview.src = ev.target.result;
        bannerImagePreview.style.display = 'block';
        PREVIEW.bannerUrl = ev.target.result;
        previewBanner.src = PREVIEW.bannerUrl;
      };
      reader.readAsDataURL(file);
    }
  });

  // live small-preview updates from text inputs
  const storeNameInput = document.getElementById('storeName');
  const storeDescInput = document.getElementById('storeDescription');
  const storeUsernameInput = document.getElementById('storeUsername');
  storeNameInput.addEventListener('input', () => {
    previewStoreName.textContent = storeNameInput.value || 'Store Name';
    PREVIEW.storeName = storeNameInput.value;
  });
  storeDescInput.addEventListener('input', () => {
    previewStoreDesc.textContent = storeDescInput.value || 'Short bio or tagline appears here.';
    PREVIEW.storeDesc = storeDescInput.value;
  });

  // links -> preview
  linkWhatsapp.addEventListener('input', () => previewWhats.href = linkWhatsapp.value ? `https://wa.me/${linkWhatsapp.value.replace(/\D+/g,'')}` : '#');
  linkFacebook.addEventListener('input', () => previewFB.href = linkFacebook.value ? `https://facebook.com/${linkFacebook.value}` : '#');
  linkTiktok.addEventListener('input', () => previewTT.href = linkTiktok.value ? `https://tiktok.com/${linkTiktok.value.replace(/^@/,'')}` : '#');

  // map preview update (simple embed using google maps embed url - no API)
  function updateMapPreview(address) {
    if (!address || address.trim() === '') {
      mapIframe.src = '';
      return;
    }
    const encoded = encodeURIComponent(address);
    // Google Maps Embed with q param works without API for many cases
    mapIframe.src = `https://maps.google.com/maps?q=${encoded}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  }
  storeLocation.addEventListener('change', () => updateMapPreview(storeLocation.value));
  storeLocation.addEventListener('input', () => {
    // debounce quick typing visually
    clearTimeout(storeLocation._mapDeb);
    storeLocation._mapDeb = setTimeout(() => updateMapPreview(storeLocation.value), 700);
  });

  // opening hours additions
  function addHourRow(existing = null) {
    // existing: { day, opensAt, closesAt, closed }
    const row = document.createElement('div');
    row.className = 'hour-row';
    row.innerHTML = `
      <select class="day-select">
        <option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option>
        <option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option>
        <option value="Sunday">Sunday</option>
      </select>
      <input type="time" class="hour-start" />
      <input type="time" class="hour-end" />
      <label style="display:flex;align-items:center;gap:6px;margin-left:6px;"><input type="checkbox" class="closed-checkbox" /> Closed</label>
      <button type="button" class="btn remove-hour" title="Remove">✕</button>
    `;
    // fill existing
    if (existing) {
      row.querySelector('.day-select').value = existing.day;
      row.querySelector('.hour-start').value = existing.opensAt || '';
      row.querySelector('.hour-end').value = existing.closesAt || '';
      row.querySelector('.closed-checkbox').checked = !!existing.closed;
      if (existing.closed) { row.querySelector('.hour-start').disabled = true; row.querySelector('.hour-end').disabled = true; }
    }
    // remove handler
    row.querySelector('.remove-hour').addEventListener('click', () => row.remove());
    // closed toggle
    row.querySelector('.closed-checkbox').addEventListener('change', (e) => {
      const checked = e.currentTarget.checked;
      row.querySelector('.hour-start').disabled = checked;
      row.querySelector('.hour-end').disabled = checked;
    });
    hoursList.appendChild(row);
  }

  addHourBtn.addEventListener('click', () => addHourRow());

  // Template preview apply/reset
  previewApplyBtn.addEventListener('click', () => {
    document.documentElement.style.setProperty('--ko-primary', themeColorInput.value || '#007aff');
    document.documentElement.style.setProperty('font-family', themeFontInput.value || '');
    previewPanel.style.fontFamily = themeFontInput.value;
    previewBanner.src = PREVIEW.bannerUrl || '';
    previewAvatar.src = PREVIEW.avatarUrl || '';
    previewStoreName.textContent = storeNameInput.value || 'Store Name';
    previewStoreDesc.textContent = storeDescInput.value || 'Short bio or tagline appears here.';
  });
  previewResetBtn.addEventListener('click', () => {
    themeColorInput.value = '#007aff';
    themeFontInput.value = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
    layoutSelect.value = 'grid';
    document.documentElement.style.removeProperty('--ko-primary');
    document.documentElement.style.removeProperty('font-family');
  });

  // wire form submit to your handler (we will enhance handleFormSubmit later)
  storeForm.addEventListener('submit', handleFormSubmit);

  // --- Load existing data for the user (keeps your previous logic but extends)
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists() && userDoc.data().store) {
    const store = userDoc.data().store;
    const links = store.links || {};
    const design = store.design || {};
    const footer = store.footer || {};
    const contact = store.contact || {};
    const openingHours = store.openingHours || [];

    // preserve existing dataset fields for uploads
    storeForm.dataset.existingProfileUrl = store.profileImageUrl || '';
    storeForm.dataset.existingBannerUrl = design.bannerUrl || '';

    storeForm.storeUsername.value = store.username || '';
    storeForm.storeName.value = store.storeName || '';
    storeForm.storeDescription.value = store.description || '';
    if (store.profileImageUrl) {
      profileImagePreview.src = store.profileImageUrl;
      profileImagePreview.style.display = 'block';
      PREVIEW.avatarUrl = store.profileImageUrl;
      previewAvatar.src = PREVIEW.avatarUrl;
    }
    if (design.bannerUrl) {
      bannerImagePreview.src = design.bannerUrl;
      bannerImagePreview.style.display = 'block';
      PREVIEW.bannerUrl = design.bannerUrl;
      previewBanner.src = PREVIEW.bannerUrl;
    }

    // DESIGN
    themeColorInput.value = design.themeColor || '#007aff';
    themeFontInput.value = design.font || themeFontInput.value;
    layoutSelect.value = design.layout || 'grid';
    document.documentElement.style.setProperty('--ko-primary', themeColorInput.value);
    previewPanel.style.fontFamily = themeFontInput.value;

    // LINKS
    linkWhatsapp.value = links.whatsapp || '';
    linkFacebook.value = links.facebook || '';
    linkTiktok.value = links.tiktok || '';
    linkGithub.value = links.github || '';

    // CONTACT
    storeTel.value = contact.telephone || '';
    storeLocation.value = contact.location || '';
    updateMapPreview(storeLocation.value);

    // Opening hours (populate list)
    hoursList.innerHTML = '';
    if (openingHours.length > 0) {
      openingHours.forEach(h => addHourRow(h));
    } else {
      // default: add Monday-Fri example row
      addHourRow({ day: 'Monday', opensAt: '08:00', closesAt: '17:00' });
    }
  } else {
    // no store yet — make a default hour row
    addHourRow({ day: 'Monday', opensAt: '08:00', closesAt: '17:00' });
  }

  // update preview links on load
  previewWhats.href = linkWhatsapp.value ? `https://wa.me/${linkWhatsapp.value.replace(/\D+/g,'')}` : '#';
  previewFB.href = linkFacebook.value ? `https://facebook.com/${linkFacebook.value}` : '#';
  previewTT.href = linkTiktok.value ? `https://tiktok.com/${linkTiktok.value.replace(/^@/,'')}` : '#';

  // small follower count (optional future feature)
  const followersDisplay = document.getElementById('followersDisplay');
  // If you later add follower count, populate this span.

  // done loading — remove spinner if present
  if (loadingSpinner) loadingSpinner.remove();
}

// +++++ THIS IS YOUR UPLOAD FUNCTION FROM YOUR PRODUCT FORM (kept intact) +++++
async function uploadImageToCloudinary(file) {
  try {
    const response = await fetch('/.netlify/functions/generate-signature');
    if (!response.ok) throw new Error('Could not get upload signature. Please try again.');
    const { signature, timestamp, cloudname, apikey } = await response.json();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apikey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
    const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
    }

    const uploadData = await uploadResponse.json();
    return uploadData.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}
// +++++ END UPLOAD FUNCTION +++++

// ================================================================== //
//   THIS IS THE ENHANCED handleFormSubmit (keeps your original flow)
// ================================================================== //

async function handleFormSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  const saveButton = document.getElementById('saveButton');
  const storeForm = document.getElementById('storeForm');
  const messageBox = document.getElementById('messageBox');

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';
  showMessage('info', 'Validating store data...');

  const username = storeForm.storeUsername.value.trim().toLowerCase();

  // --- Validate Username Format (same as yours) ---
  if (!/^[a-z0-9-]+$/.test(username)) {
    showMessage('error', 'Username can only contain lowercase letters, numbers, and hyphens (-).');
    saveButton.disabled = false;
    saveButton.textContent = 'Save Changes';
    return;
  }

  // --- Get existing username (if any) ---
  const userDocRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userDocRef);
  const existingUsername = userDoc.exists() ? userDoc.data().store?.username : null;

  // USERNAME CHECK LOGIC (unchanged)
  let usernameChanged = (username !== existingUsername);
  if (usernameChanged) {
    showMessage('info', 'Checking username availability...');
    const newUsernameRef = doc(db, 'storeUsernames', username);
    const newUsernameDoc = await getDoc(newUsernameRef);
    if (newUsernameDoc.exists()) {
      showMessage('error', 'This store username is already taken. Please choose another.');
      saveButton.disabled = false;
      saveButton.textContent = 'Save Changes';
      return;
    }
  }

  try {
    // existing urls (if any) stored in dataset
    let profileImageUrl = storeForm.dataset.existingProfileUrl || '';
    let bannerUrl = storeForm.dataset.existingBannerUrl || '';

    const profileImageFile = storeForm.storeProfileImageFile.files[0];
    const bannerImageFile = storeForm.storeBannerFile.files[0];

    // upload profile if new
    if (profileImageFile) {
      showMessage('info', 'Uploading profile picture...');
      saveButton.textContent = 'Uploading Profile...';
      profileImageUrl = await uploadImageToCloudinary(profileImageFile);
      showMessage('info', 'Profile picture uploaded!');
    }

    // upload banner if new
    if (bannerImageFile) {
      showMessage('info', 'Uploading store banner...');
      saveButton.textContent = 'Uploading Banner...';
      bannerUrl = await uploadImageToCloudinary(bannerImageFile);
      showMessage('info', 'Store banner uploaded!');
    }

    // collect opening hours rows
    const hoursRows = Array.from(document.querySelectorAll('.hour-row'));
    const openingHours = hoursRows.map(row => {
      return {
        day: row.querySelector('.day-select').value,
        opensAt: row.querySelector('.hour-start').value || null,
        closesAt: row.querySelector('.hour-end').value || null,
        closed: !!row.querySelector('.closed-checkbox').checked
      };
    });

    // collect contact info
    const contact = {
      telephone: document.getElementById('storeTel').value.trim(),
      location: document.getElementById('storeLocation').value.trim()
    };

    // collect design/template choices
    const design = {
      bannerUrl: bannerUrl,
      themeColor: document.getElementById('storeThemeColor').value,
      font: document.getElementById('storeThemeFont').value,
      layout: document.getElementById('storeLayout').value
    };

    // collect links
    const links = {
      whatsapp: document.getElementById('linkWhatsapp').value.trim(),
      facebook: document.getElementById('linkFacebook').value.trim(),
      tiktok: document.getElementById('linkTiktok').value.trim(),
      github: document.getElementById('linkGithub').value.trim()
    };

    // prepare storeData (extended with contact & openingHours & design)
    showMessage('info', 'Saving settings to database...');
    saveButton.textContent = 'Saving...';

    const storeData = {
      username: username,
      storeName: storeForm.storeName.value.trim(),
      description: storeForm.storeDescription.value.trim(),
      profileImageUrl: profileImageUrl,
      links,
      design,
      footer: {
        text: document.getElementById('footerText').value.trim(),
        color: document.getElementById('footerColor').value
      },
      contact,
      openingHours,
      updatedAt: new Date()
    };

    // --- Save to Firestore (preserve your original flow) ---
    // 1. Save to private user doc
    await setDoc(userDocRef, {
      store: storeData,
      isSeller: true
    }, { merge: true });

    // 2. Update public username lookup
    const newUsernameRef = doc(db, 'storeUsernames', username);
    await setDoc(newUsernameRef, { userId: currentUser.uid });

    // remove old username if changed
    if (usernameChanged && existingUsername) {
      const oldUsernameRef = doc(db, 'storeUsernames', existingUsername);
      await deleteDoc(oldUsernameRef).catch(err => {
        console.warn("Could not delete old username doc:", err);
      });
    }

    // 3. SAVE TO PUBLIC STORE DIRECTORY (extended to include contact & short opening snippet)
    const publicStoreRef = doc(db, 'publicStores', currentUser.uid);
    await setDoc(publicStoreRef, {
      userId: currentUser.uid,
      username: username,
      storeName: storeData.storeName,
      description: (storeData.description || '').substring(0, 100),
      profileImageUrl: profileImageUrl || '',
      contact: {
        telephone: contact.telephone || '',
        location: contact.location || ''
      }
    }, { merge: true });

    showMessage('success', 'Store updated successfully! Your public store link is now active.');

  } catch (error) {
    console.error("Error saving store:", error);
    let politeError = `Could not save store: ${error.message}`;
    if (error.message.includes('Cloudinary')) {
      politeError = 'Polite Error: We had trouble uploading your image.';
    } else if (error.message.includes('permission')) {
      politeError = 'Polite Error: Could not save username. Please try again.';
    }
    showMessage('error', politeError);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Changes';
  }
}

// ------------------ Message helper (kept but richer) ----------------
function showMessage(type, text) {
  const messageBox = document.getElementById('messageBox');
  if (!messageBox) return;
  messageBox.style.display = 'block';
  messageBox.className = `message ${type}`;
  messageBox.textContent = text;
  if (type === 'error') {
    messageBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${text}`;
  } else if (type === 'success') {
    messageBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${text}`;
  } else if (type === 'info') {
    messageBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
  }
  // auto-hide success after a short time
  if (type === 'success') {
    clearTimeout(messageBox._hide);
    messageBox._hide = setTimeout(() => { messageBox.style.display = 'none'; }, 4500);
  }
}