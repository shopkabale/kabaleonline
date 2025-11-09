// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//      CHAT ROOM SCRIPT (chat.js) - *MESSAGE & UI FIX* //
//                                                                     //
// =================================================================== //

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    limit,
    where 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Elements ---
const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');
const chatTitle = document.getElementById('chat-title');
const replyBanner = document.getElementById('reply-banner');
const replyToNameEl = document.getElementById('reply-to-name');
const replyToPreviewEl = document.getElementById('reply-to-preview');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

// Image Upload Elements (Your existing code)
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageUploadInput = document.getElementById('image-upload-input');

// NEW: Chat Header Elements
const chatHeaderInfo = document.getElementById('chat-header-info');
const chatHeaderImg = document.getElementById('chat-header-img');
const chatHeaderPlaceholder = document.getElementById('chat-header-placeholder');

// NEW: Group Details Modal Elements
const groupDetailsModal = document.getElementById('group-details-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalEditBtn = document.getElementById('modal-edit-btn');
const modalGroupImg = document.getElementById('modal-group-img');
const modalGroupName = document.getElementById('modal-group-name');
const modalGroupDescription = document.getElementById('modal-group-description');
const modalMembersList = document.getElementById('modal-members-list');
const modalMembersLoader = document.getElementById('modal-members-loader');

// NEW: Edit Group Modal Elements
const editGroupModal = document.getElementById('edit-group-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editGroupForm = document.getElementById('edit-group-form');
const editGroupSubmit = document.getElementById('edit-group-submit');
const editGroupNameInput = document.getElementById('edit-group-name');
const editGroupDescInput = document.getElementById('edit-group-description');
const editModalError = document.getElementById('edit-modal-error');

// --- Global State ---
let currentUser = null;
let currentGroupId = null;
let currentGroupData = null; // NEW: Stores all group data
let unsubscribe = null; 
let replyingToMessage = null;

// --- Main Initialization ---
async function initializeChat() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                console.error("User document not found.");
                window.location.href = '/login/';
                return;
            }
            currentUser = {
                uid: user.uid,
                name: userDoc.data().name,
                profilePicUrl: userDoc.data().profilePicUrl
            };

            const urlParams = new URLSearchParams(window.location.search);
            currentGroupId = urlParams.get('groupId');

            if (!currentGroupId) {
                alert("Error: No group ID specified.");
                window.location.href = 'index.html'; // Back to group list
                return;
            }
            
            // NEW: Listen for group details in real-time (for edits)
            const groupDocRef = doc(db, "groups", currentGroupId);
            onSnapshot(groupDocRef, (groupDoc) => {
                if (groupDoc.exists()) {
                    currentGroupData = groupDoc.data();
                    updateChatHeader(); // Update UI
                } else {
                     alert("Error: This group does not exist.");
                     window.location.href = 'index.html';
                }
            });
            
            backButton.href = 'index.html'; // Link back to the group list
            listenForMessages(currentGroupId);
            setupModalListeners(); // NEW: Set up modal logic

        } else {
            window.location.href = '/login/';
        }
    });
}

// NEW: Update Chat Header
function updateChatHeader() {
    if (!currentGroupData) return;
    
    chatTitle.textContent = currentGroupData.name;
    
    if (currentGroupData.imageUrl) {
        chatHeaderImg.src = currentGroupData.imageUrl;
        chatHeaderImg.style.display = 'block';
        chatHeaderPlaceholder.style.display = 'none';
    } else {
        chatHeaderPlaceholder.textContent = (currentGroupData.name || 'G').charAt(0).toUpperCase();
        chatHeaderImg.style.display = 'none';
        chatHeaderPlaceholder.style.display = 'block';
    }
}

// ================================================================= //
// === THIS IS THE FIX for the "Disappearing Message" bug ===
// We now clear the list and re-render from snapshot.docs every time
// This is foolproof and prevents any logic errors.
// ================================================================= //
function listenForMessages(groupId) {
    if (unsubscribe) unsubscribe(); 

    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    unsubscribe = onSnapshot(q, (snapshot) => {
        messageArea.innerHTML = ''; // Clear the chat area *every* time
        
        snapshot.docs.forEach((doc) => {
            const messageData = { id: doc.id, ...doc.data() };
            renderMessage(messageData); // Render *all* messages in order
        });
        
        // Scroll to bottom
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100); // Small delay to wait for render
    }, (error) => {
        console.error("Error fetching messages:", error);
        messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
    });
}
// ================================================================= //
// === END OF FIX ===
// ================================================================= //

// --- This is YOUR reply UI logic ---
function updateReplyUI() {
    if (replyingToMessage) {
        replyToNameEl.textContent = replyingToMessage.sender;
        replyToPreviewEl.textContent = replyingToMessage.text;
        replyBanner.style.display = 'block';
        messageInput.focus();
    } else {
        replyBanner.style.display = 'none';
    }
}

// --- MODIFIED: Renders both TEXT and IMAGE messages ---
function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === currentUser.uid;
    if (isOwnMessage) {
        messageDiv.classList.add('own-message');
    }

    const avatar = data.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(data.userName || 'U').charAt(0)}`;

    // 1. Check for Reply Quote
    let replyQuoteHTML = '';
    if (data.repliedToMessageId) {
        replyQuoteHTML = `
            <div class="reply-quote">
                <div class="reply-quote-sender">${data.repliedToSender || '...'}</div>
                <div class="reply-quote-text">${data.repliedToText || '...'}</div>
            </div>
        `;
    }

    // 2. Check for Message Type (Text vs Image) - This is your existing code
    let messageBubbleHTML = '';
    if (data.type === 'image' && data.imageData) {
        // This is an image message
        messageBubbleHTML = `
            <p class="message-bubble message-image">
                <img src="${data.imageData}" alt="User image" loading="lazy">
            </p>
        `;
    } else {
        // This is a standard text message
        messageBubbleHTML = `<p class="message-bubble">${data.text || ''}</p>`;
    }

    // 3. Render
    const senderName = isOwnMessage ? '' : `<div class="message-sender">${data.userName}</div>`;
    
    messageDiv.innerHTML = `
        <a href="../profile.html?id=${data.userId}" class="message-profile-link">
            <img src="${avatar}" alt="${data.userName}" class="message-avatar">
        </a>
        <div class="message-content">
            <div>
                <a href="../profile.html?id=${data.userId}" class="message-profile-link" style="text-decoration:none;">
                    ${senderName}
                </a>
                ${replyQuoteHTML}
                ${messageBubbleHTML}
            </div>
            <button class="reply-btn" data-id="${data.id}" data-sender="${data.userName}" data-text="${data.text || 'Image'}">
                <i class="fas fa-reply"></i>
            </button>
        </div>
    `;
    messageArea.appendChild(messageDiv);
}

// --- Form submit (Your existing code) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser && currentGroupId) {
        const newMessage = {
            type: "text", // This is a text message
            text: messageText,
            userId: currentUser.uid,
            userName: currentUser.name,
            profilePicUrl: currentUser.profilePicUrl || '',
            createdAt: serverTimestamp()
        };

        if (replyingToMessage) {
            newMessage.repliedToMessageId = replyingToMessage.id;
            newMessage.repliedToSender = replyingToMessage.sender;
            newMessage.repliedToText = replyingToMessage.text;
        }

        try {
            await addDoc(collection(db, "groups", currentGroupId, "messages"), newMessage);
            messageInput.value = '';
            replyingToMessage = null;
            updateReplyUI();
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
});

// --- Image Upload (Your existing code) ---
imageUploadBtn.addEventListener('click', () => {
    imageUploadInput.click(); // Open the file picker
});

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB size limit
        alert("Image is too large. Please choose a file under 500KB.");
        return;
    }
    resizeAndSendImage(file);
    e.target.value = null;
});

function resizeAndSendImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL(file.type, 0.8);
            sendImageMessage(dataUrl);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

async function sendImageMessage(base64ImageData) {
    if (!currentUser || !currentGroupId) return;

    const newMessage = {
        type: "image",
        imageData: base64ImageData,
        userId: currentUser.uid,
        userName: currentUser.name,
        profilePicUrl: currentUser.profilePicUrl || '',
        createdAt: serverTimestamp()
    };
    
    if (replyingToMessage) {
        newMessage.repliedToMessageId = replyingToMessage.id;
        newMessage.repliedToSender = replyingToMessage.sender;
        newMessage.repliedToText = replyingToMessage.text;
    }

    try {
        await addDoc(collection(db, "groups", currentGroupId, "messages"), newMessage);
        replyingToMessage = null;
        updateReplyUI();
    } catch (error) {
        console.error("Error sending image message: ", error);
    }
}


// --- Reply Logic (Your existing code) ---
messageArea.addEventListener('click', (e) => {
    const replyButton = e.target.closest('.reply-btn');
    if (replyButton) {
        replyingToMessage = {
            id: replyButton.dataset.id,
            sender: replyButton.dataset.sender,
            text: replyButton.dataset.text
        };
        updateReplyUI();
    }
});

cancelReplyBtn.addEventListener('click', () => {
    replyingToMessage = null;
    updateReplyUI();
});

// --- NEW: Group Details Modal Logic ---
function setupModalListeners() {
    // Open Details Modal
    chatHeaderInfo.addEventListener('click', () => {
        if (!currentGroupData) return;
        
        // 1. Populate static info
        modalGroupName.textContent = currentGroupData.name;
        modalGroupDescription.textContent = currentGroupData.description;
        
        if (currentGroupData.imageUrl) {
            modalGroupImg.src = currentGroupData.imageUrl;
        } else {
            modalGroupImg.src = `https://placehold.co/150x150/10336d/a7c0e8?text=${(currentGroupData.name || 'G').charAt(0)}`;
        }
        
        // 2. Show/Hide Edit button
        if (currentUser.uid === currentGroupData.createdBy) {
            modalEditBtn.style.display = 'block';
        } else {
            modalEditBtn.style.display = 'none';
        }
        
        // 3. Show modal
        groupDetailsModal.classList.add('active');
        
        // 4. Fetch members
        fetchGroupMembers(currentGroupData.members);
    });

    // Close Details Modal
    modalCloseBtn.addEventListener('click', () => {
        groupDetailsModal.classList.remove('active');
    });

    // Open Edit Modal
    modalEditBtn.addEventListener('click', () => {
        editGroupNameInput.value = currentGroupData.name;
        editGroupDescInput.value = currentGroupData.description;
        editModalError.style.display = 'none';
        editGroupModal.classList.add('active');
    });

    // Close Edit Modal
    closeEditModalBtn.addEventListener('click', () => {
        editGroupModal.classList.remove('active');
    });

    // Handle Edit Form Submit
    editGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = editGroupNameInput.value.trim();
        const newDesc = editGroupDescInput.value.trim();
        
        if (!newName) {
            editModalError.textContent = "Group name is required.";
            editModalError.style.display = 'block';
            return;
        }
        
        editGroupSubmit.disabled = true;
        editGroupSubmit.textContent = "Saving...";
        
        try {
            const groupDocRef = doc(db, "groups", currentGroupId);
            await updateDoc(groupDocRef, {
                name: newName,
                description: newDesc
            });
            
            // Success
            editGroupModal.classList.remove('active');
            
        } catch (error) {
            console.error("Error updating group:", error);
            editModalError.textContent = "Could not save. Please try again.";
            editModalError.style.display = 'block';
        } finally {
            editGroupSubmit.disabled = false;
            editGroupSubmit.textContent = "Save Changes";
        }
    });
}

// NEW: Fetch and Render Group Members
async function fetchGroupMembers(memberIds) {
    modalMembersList.innerHTML = ''; // Clear old list
    modalMembersLoader.style.display = 'block';

    try {
        // Fetch all user docs in parallel
        const userPromises = memberIds.map(id => getDoc(doc(db, "users", id)));
        const userDocs = await Promise.all(userPromises);
        
        modalMembersList.innerHTML = ''; // Clear again just in case
        
        userDocs.forEach(userDoc => {
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const memberDiv = document.createElement('div');
                memberDiv.className = 'member-item';
                
                const avatar = userData.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
                const role = userData.uid === currentGroupData.createdBy ? '<span class="member-role">Admin</span>' : '';
                
                memberDiv.innerHTML = `
                    <img src="${avatar}" alt="${userData.name}" class="member-avatar">
                    <span class="member-name">${userData.name || 'User'}</span>
                    ${role}
                `;
                modalMembersList.appendChild(memberDiv);
            }
        });

    } catch (error) {
        console.error("Error fetching members:", error);
        modalMembersList.innerHTML = '<p style="padding: 20px; text-align: center;">Could not load members.</p>';
    } finally {
        modalMembersLoader.style.display = 'none';
    }
}

window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

// --- Run the main function ---
initializeChat();