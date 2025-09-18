/**
 * main.js - DIAGNOSTIC MODE
 * This file is for testing purposes only. It will try to fetch from
 * both Algolia and Firestore separately and display the raw results.
 */

// --- Firebase Imports ---
import { db } from "./firebase.js";
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM References ---
const algoliaGrid = document.getElementById('algolia-results-grid');
const firestoreGrid = document.getElementById('firestore-results-grid');

// --- Helper Function ---
function renderTestResults(products, targetGrid, sourceName) {
    targetGrid.innerHTML = `<h4>Found ${products.length} total products from ${sourceName}</h4>`;
    if (products.length === 0) {
        targetGrid.innerHTML += `<p>The query returned no items.</p>`;
        return;
    }
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.imageUrls?.[0] || 'https://placehold.co/200x200'}" alt="${product.name}" loading="lazy">
            <h3>${product.name || 'No Name'}</h3>
            <p class="price">ID: ${product.id}</p>
        `;
        targetGrid.appendChild(card);
    });
}

/**
 * TEST 1: Tries to fetch from your Algolia serverless function.
 */
async function testAlgolia() {
    try {
        // Use the simplest possible query, asking for page 0 with no search term.
        const url = `/.netlify/functions/search?page=0`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        const products = result.products || [];
        renderTestResults(products, algoliaGrid, 'Algolia');

    } catch (error) {
        console.error("ALGOLIA TEST FAILED:", error);
        algoliaGrid.innerHTML = `<h4>Algolia Test Failed</h4><p style="color: red;">${error.message}</p><p>This means your Netlify function or Algolia configuration has a problem.</p>`;
    }
}

/**
 * TEST 2: Tries to fetch ALL products directly from Firestore.
 */
async function testFirestore() {
    try {
        // Get ALL documents from the 'products' collection, with no filters at all.
        const q = query(collection(db, "products"));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTestResults(products, firestoreGrid, 'Firestore');

    } catch (error) {
        console.error("FIRESTORE TEST FAILED:", error);
        firestoreGrid.innerHTML = `<h4>Firestore Test Failed</h4><p style="color: red;">${error.message}</p><p>This means there is a problem with your Firebase connection or security rules.</p>`;
    }
}

// --- Run the tests when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    testAlgolia();
    testFirestore();
});
