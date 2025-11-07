import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const container = document.getElementById('store-create-container');
const loginTemplate = document.getElementById('login-placeholder');
const formTemplate = document.getElementById('form-template');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) { currentUser = user; loadPage(user); }
  else {
    currentUser = null;
    container.innerHTML = '';
    container.appendChild(loginTemplate.content.cloneNode(true));
  }
});

async function loadPage(user) {
  const formNode = formTemplate.content.cloneNode(true);
  container.innerHTML = '';
  container.appendChild(formNode);

  const storeForm = document.getElementById('storeForm');
  const profileImageInput = document.getElementById('storeProfileImageFile');
  const profileImagePreview = document.getElementById('profileImagePreview');
  const bannerInput = document.getElementById('storeBannerFile');
  const bannerPreview = document.getElementById('bannerImagePreview');
  const navButtons = container.querySelectorAll('.nav-button');
  const sections = container.querySelectorAll('.form-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(btn.getAttribute('href'));
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        navButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { root:null, rootMargin:'-50% 0px -50% 0px', threshold:0 });

  sections.forEach(sec => observer.observe(sec));

  // Image previews
  profileImageInput.addEventListener('change', e => { readFile(e, profileImagePreview); });
  bannerInput.addEventListener('change', e => { readFile(e, bannerPreview); });

  // Load existing data
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);
  if(userDoc.exists() && userDoc.data().store) {
    const s = userDoc.data().store;
    storeForm.storeUsername.value = s.username||'';
    storeForm.storeName.value = s.storeName||'';
    storeForm.storeDescription.value = s.description||'';
    if(s.profileImageUrl) { profileImagePreview.src = s.profileImageUrl; profileImagePreview.style.display='block'; }
    if(s.design?.bannerUrl) { bannerPreview.src = s.design.bannerUrl; bannerPreview.style.display='block'; }
    storeForm.storeThemeColor.value = s.design?.themeColor||'#007aff';
    storeForm.linkWhatsapp.value = s.links?.whatsapp||'';
    storeForm.linkFacebook.value = s.links?.facebook||'';
    storeForm.linkTiktok.value = s.links?.tiktok||'';
    storeForm.linkGithub.value = s.links?.github||'';
    storeForm.footerText.value = s.footer?.text||'';
    storeForm.footerColor.value = s.footer?.color||'#0A0A1F';
    storeForm.storePhone.value = s.phone||'';
    storeForm.storeLocation.value = s.location||'';
    storeForm.storeHours.value = s.hours||'';
    storeForm.storeMapUrl.value = s.mapUrl||'';
  }

  // Submit/save
  storeForm.addEventListener('submit', handleFormSubmit);
  document.getElementById('applyTemplateBtn').addEventListener('click', applyTemplate);
}

function readFile(e, imgPreview) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = evt => { imgPreview.src = evt.target.result; imgPreview.style.display='block'; };
    reader.readAsDataURL(file);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  if(!currentUser) return;

  const saveBtn = document.getElementById('saveButton');
  saveBtn.disabled = true; showMessage('info','Saving...');
  const storeForm = document.getElementById('storeForm');

  try {
    const profileUrl = storeForm.storeProfileImageFile.files[0] ? await uploadImageToCloudinary(storeForm.storeProfileImageFile.files[0]) : document.getElementById('profileImagePreview').src;
    const bannerUrl = storeForm.storeBannerFile.files[0] ? await uploadImageToCloudinary(storeForm.storeBannerFile.files[0]) : document.getElementById('bannerImagePreview').src;

    const data = {
      username: storeForm.storeUsername.value.trim(),
      storeName: storeForm.storeName.value.trim(),
      description: storeForm.storeDescription.value.trim(),
      profileImageUrl: profileUrl||'',
      links: {
        whatsapp: storeForm.linkWhatsapp.value.trim(),
        facebook: storeForm.linkFacebook.value.trim(),
        tiktok: storeForm.linkTiktok.value.trim(),
        github: storeForm.linkGithub.value.trim()
      },
      design: {
        bannerUrl: bannerUrl||'',
        themeColor: storeForm.storeThemeColor.value
      },
      footer: {
        text: storeForm.footerText.value,
        color: storeForm.footerColor.value
      },
      phone: storeForm.storePhone.value,
      location: storeForm.storeLocation.value,
      hours: storeForm.storeHours.value,
      mapUrl: storeForm.storeMapUrl.value,
      updatedAt: new Date()
    };

    await setDoc(doc(db,'users',currentUser.uid),{store:data,isSeller:true},{merge:true});
    showMessage('success','Store saved successfully.');
  } catch(err){ console.error(err); showMessage('error','Could not save store.'); }
  finally{ saveBtn.disabled=false; saveBtn.textContent='Save Changes'; }
}

async function applyTemplate(){
  if(!currentUser){ showMessage('error','Login first'); return; }
  const storeForm=document.getElementById('storeForm');
  const design={
    bannerUrl:document.getElementById('bannerImagePreview