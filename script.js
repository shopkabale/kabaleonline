// script.js
import { db } from "./firebase.js";
import {
  collection, query, where, orderBy, limit, getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const PAGE_SIZE = 12;
let lastDoc = null;
let currentPage = 1;
let currentCategory = "All";
let currentSearch = "";

const productGrid = document.getElementById("product-grid");
const sponsoredGrid = document.getElementById("sponsored-products-grid");
const verifiedGrid = document.getElementById("verified-products-grid");
const saleGrid = document.getElementById("sale-products-grid");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageIndicator = document.getElementById("page-indicator");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const categoryScroller = document.getElementById("category-scroller");

function normalizeWhatsApp(phone) {
  if (!phone) return "";
  let s = String(phone).trim().replace(/[^\d]/g, "");
  if (s.startsWith("256") && s.length === 12) return s;
  if (s.startsWith("0") && s.length === 10) return "256" + s.slice(1);
  if (s.length === 9) return "256" + s;
  return s;
}

function productCard(p) {
  const wnum = normalizeWhatsApp(p.phone);
  return `
    <div class="product-card">
      <img src="${p.imageUrl || p.image}" alt="${p.title}">
      <div class="product-body">
        <h3>${p.title}</h3>
        <p class="price">${Number(p.price).toLocaleString()} UGX</p>
        <p class="category">${p.category || "Other"}</p>
        <a class="whatsapp" href="https://wa.me/${wnum}?text=${encodeURIComponent(`Hello, I'm interested in "${p.title}" on KabaleOnline.`)}" target="_blank">WhatsApp Purchase</a>
      </div>
      ${p.onSale ? '<span class="badge sale">SALE</span>' : ''}
      ${p.isSponsored ? '<span class="badge sponsored">Sponsored</span>' : ''}
      ${p.isVerified ? '<span class="badge verified">Verified</span>' : ''}
    </div>
  `;
}

async function fetchPage({ category = "All", search = "", cursor = null }) {
  let base = collection(db, "products");
  let constraints = [where("approved", "==", true), orderBy("publishDate", "desc"), limit(PAGE_SIZE)];

  if (category && category !== "All") {
    constraints = [where("approved","==",true), where("category","==",category), orderBy("publishDate","desc"), limit(PAGE_SIZE)];
  }

  if (cursor) constraints.push(startAfter(cursor));
  const qRef = query(base, ...constraints);
  const snap = await getDocs(qRef);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.flagged);

  const filtered = search
    ? docs.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()))
    : docs;

  lastDoc = snap.docs[snap.docs.length - 1] || null;
  return filtered;
}

async function renderPage() {
  productGrid.innerHTML = "<p>Loading...</p>";
  const products = await fetchPage({ category: currentCategory, search: currentSearch, cursor: null });
  productGrid.innerHTML = products.map(productCard).join("") || "<p>No products yet.</p>";
  pageIndicator.textContent = `Page ${currentPage}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = !lastDoc;
}

prevBtn.addEventListener("click", async () => { currentPage = 1; lastDoc = null; await renderPage(); });
nextBtn.addEventListener("click", async () => {
  if (!lastDoc) return;
  let constraints = [where("approved","==",true), orderBy("publishDate","desc"), limit(PAGE_SIZE), startAfter(lastDoc)];
  if (currentCategory !== "All") constraints = [where("approved","==",true), where("category","==",currentCategory), orderBy("publishDate","desc"), limit(PAGE_SIZE), startAfter(lastDoc)];

  const snap = await getDocs(query(collection(db,"products"), ...constraints));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.flagged);

  productGrid.innerHTML = docs.map(productCard).join("") || "<p>No more products.</p>";
  lastDoc = snap.docs[snap.docs.length - 1] || null;
  currentPage++; pageIndicator.textContent = `Page ${currentPage}`;
  prevBtn.disabled = currentPage === 1; nextBtn.disabled = !lastDoc;
});

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  currentSearch = searchInput.value.trim();
  currentPage = 1; lastDoc = null; await renderPage();
});

categoryScroller.addEventListener("click", async (e) => {
  const btn = e.target.closest(".category-btn");
  if (!btn) return;
  document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentCategory = btn.dataset.category;
  currentPage = 1; lastDoc = null; await renderPage();
});

// Optional: keep your CMS rails if you still use /admin to curate JSON
async function loadCMSBlocks() {
  try {
    const res = await fetch("/cms-products/products.json", { cache: "no-store" });
    if (!res.ok) throw 0;
    const data = await res.json();
    const sponsored = data.products.filter(p => p.isSponsored);
    const verified = data.products.filter(p => p.isVerified);
    const onSale = data.products.filter(p => p.onSale);
    sponsoredGrid.innerHTML = sponsored.map(productCard).join("") || "<p>No sponsored yet.</p>";
    verifiedGrid.innerHTML = verified.map(productCard).join("") || "<p>No verified yet.</p>";
    saleGrid.innerHTML = onSale.map(productCard).join("") || "<p>No deals yet.</p>";
  } catch { sponsoredGrid.innerHTML = "<p>—</p>"; verifiedGrid.innerHTML = "<p>—</p>"; saleGrid.innerHTML = "<p>—</p>"; }
}

loadCMSBlocks();
renderPage();