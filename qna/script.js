import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collectionGroup, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('qna-loader');
const content = document.getElementById('qna-content');
const messageEl = document.getElementById('qna-message');
const unansweredList = document.getElementById('unanswered-qna-list');
const answeredList = document.getElementById('answered-qna-list');

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadQandA(user.uid);
    }
});

async function loadQandA(uid) {
    try {
        // Use a collectionGroup query to find all 'qanda' documents for the seller
        const q = query(collectionGroup(db, 'qanda'), where('sellerId', '==', uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            unansweredList.innerHTML = '<p>No unanswered questions right now.</p>';
            answeredList.innerHTML = '<p>No answered questions yet.</p>';
            return;
        }
        
        // Fetch product names in parallel for better performance
        const productPromises = querySnapshot.docs.map(doc => {
            const productId = doc.ref.parent.parent.id;
            return getDoc(doc.ref.parent.parent);
        });
        const productDocs = await Promise.all(productPromises);
        const productMap = new Map(productDocs.map(doc => [doc.id, doc.data()?.name || 'Unknown Product']));

        let unansweredHTML = '';
        let answeredHTML = '';

        querySnapshot.forEach(doc => {
            const qa = doc.data();
            const qandaId = doc.id;
            const productId = doc.ref.parent.parent.id;
            const productName = productMap.get(productId);

            if (qa.answer) { // If it has been answered
                answeredHTML += `
                    <div class="qna-item">
                        <p class="product-link">On product: <a href="/product.html?id=${productId}">${productName}</a></p>
                        <p class="question-text"><strong>Q:</strong> ${qa.question}</p>
                        <div class="answered-text"><strong>A:</strong> ${qa.answer}</div>
                    </div>
                `;
            } else { // If it's unanswered
                unansweredHTML += `
                    <div class="qna-item">
                        <p class="product-link">On product: <a href="/product.html?id=${productId}">${productName}</a></p>
                        <p class="question-text"><strong>Q:</strong> ${qa.question}</p>
                        <form class="answer-form" data-product-id="${productId}" data-qanda-id="${qandaId}">
                            <textarea placeholder="Type your answer here..." required></textarea>
                            <button type="submit" class="cta-button">Submit Answer</button>
                        </form>
                    </div>
                `;
            }
        });

        unansweredList.innerHTML = unansweredHTML || '<p>No unanswered questions right now.</p>';
        answeredList.innerHTML = answeredHTML || '<p>No answered questions yet.</p>';

    } catch (error) {
        console.error("Error loading Q&A:", error);
        showMessage(messageEl, 'Could not load your questions and answers.', true);
    } finally {
        loader.style.display = 'none';
        content.style.display = 'block';
    }
}

// Use event delegation to handle all form submissions
unansweredList.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!e.target.classList.contains('answer-form')) return;

    const form = e.target;
    const { productId, qandaId } = form.dataset;
    const answerText = form.querySelector('textarea').value.trim();
    const submitBtn = form.querySelector('button');

    if (!answerText) {
        alert("Please type an answer.");
        return;
    }

    toggleLoading(submitBtn, true, 'Submitting...');
    try {
        const qandaDocRef = doc(db, 'products', productId, 'qanda', qandaId);
        await updateDoc(qandaDocRef, {
            answer: answerText,
            answeredAt: serverTimestamp()
        });
        
        showMessage(messageEl, 'Answer submitted successfully!', false);
        await loadQandA(currentUser.uid); // Refresh the entire list

    } catch (error) {
        console.error("Error submitting answer:", error);
        showMessage(messageEl, 'Failed to submit your answer.', true);
    } finally {
        toggleLoading(submitBtn, false, 'Submit Answer');
    }
});