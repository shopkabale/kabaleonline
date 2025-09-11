import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productName = document.getElementById('product-name');
const productPrice = document.getElementById('product-price');
const productDescription = document.getElementById('product-description');
const productImages = document.getElementById('product-images');
const contactSellerBtn = document.getElementById('contact-seller-btn');
const qandaList = document.getElementById('qanda-list');
const qandaForm = document.getElementById('qanda-form');
const questionInput = document.getElementById('question-input');

let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
  document.body.innerHTML = '<h1>Product not found</h1><p>Missing product ID in URL.</p>';
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loadProductDetails();
});

async function loadProductDetails() {
  try {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      productName.textContent = 'Product Not Found';
      return;
    }

    const productData = productSnap.data();
    productName.textContent = productData.name || 'No name';
    productPrice.textContent = `UGX ${productData.price?.toLocaleString() || '0'}`;
    productDescription.textContent = productData.description || 'No description';

    // Display images
    productImages.innerHTML = '';
    (productData.imageUrls || []).forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = productData.name;
      productImages.appendChild(img);
    });

    // Setup Contact Seller Button
    const sellerId = productData.sellerId; // ✅ CORRECTED LINE
    if (sellerId) {
      if (currentUser && currentUser.uid === sellerId) {
        contactSellerBtn.textContent = "This is your listing";
        contactSellerBtn.disabled = true;
      } else {
        contactSellerBtn.href = `/chat.html?recipientId=${sellerId}`;
      }
    } else {
      contactSellerBtn.textContent = "Seller info missing";
      contactSellerBtn.disabled = true;
    }

    // Load Q&A
    loadQandA(sellerId);

  } catch (err) {
    console.error("Error loading product:", err);
    productName.textContent = 'Error loading product';
  }
}

function loadQandA(sellerId) {
  const qandaRef = collection(db, 'products', productId, 'qanda');
  const q = query(qandaRef, orderBy('timestamp', 'desc'));

  onSnapshot(q, (snapshot) => {
    qandaList.innerHTML = '';
    if (snapshot.empty) {
      qandaList.innerHTML = '<p>No questions yet. Be the first to ask!</p>';
    }
    snapshot.forEach(docSnap => {
      const qa = docSnap.data();
      const div = document.createElement('div');
      div.className = 'qa-item';
      div.innerHTML = `
        <p class="question"><strong>Q:</strong> ${qa.question}</p>
        ${qa.answer ? `<p class="answer"><strong>A:</strong> ${qa.answer}</p>` : '<p class="answer"><em>Awaiting answer from seller...</em></p>'}
      `;
      qandaList.appendChild(div);
    });
  });

  qandaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const questionText = questionInput.value.trim();
    if (!questionText || !currentUser) {
      alert('Please log in and type a question.');
      return;
    }

    try {
      await addDoc(qandaRef, {
        question: questionText,
        answer: null,
        askerId: currentUser.uid,
        sellerId: sellerId,
        timestamp: serverTimestamp()
      });
      questionInput.value = '';
    } catch (err) {
      console.error("Error submitting question:", err);
      alert('Could not submit your question.');
    }
  });
}
