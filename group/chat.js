// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//      CHAT ROOM SCRIPT (chat.js) - *FEATURE UPDATE* //
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
    where,
    arrayRemove // <-- NEW: Added for removing members
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

// Image Upload Elements
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageUploadInput = document.getElementById('image-upload-input');

// Chat Header Elements
const chatHeaderInfo = document.getElementById('chat-header-info');
const chatHeaderImg = document.getElementById('chat-header-img');
const chatHeaderPlaceholder = document.getElementById('chat-header-placeholder');

// Group Details Modal Elements
const groupDetailsModal = document.getElementById('group-details-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalEditBtn = document.getElementById('modal-edit-btn');
const modalGroupImg = document.getElementById('modal-group-img');
const modalGroupName = document.getElementById('modal-group-name');
const modalGroupDescription = document.getElementById('modal-group-description');
const modalMembersList = document.getElementById('modal-members-list');
const modalMembersLoader = document.getElementById('modal-members-loader');
const shareGroupBtn = document.getElementById('share-group-btn'); // <-- NEW
const toastNotification = document.getElementById('toast-notification'); // <-- NEW

// Edit Group Modal Elements
const editGroupModal = document.getElementById('edit-group-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editGroupForm = document.getElementById('edit-group-form');
const editGroupSubmit = document.getElementById('edit-group-submit');
const editGroupNameInput = document.getElementById('edit-group-name');
const editGroupDescInput = document.getElementById('edit-group-description');
const editModalError = document.getElementById('edit-modal-error');
const editGroupImageUploadArea = document.getElementById('edit-group-image-upload-area');
const editGroupImageInput = document.getElementById('edit-group-image-input');
const editGroupImagePreviewContainer = document.getElementById('edit-group-image-preview-container');
const editGroupImageUploadIcon = document.getElementById('edit-group-image-upload-icon');

// --- Global State ---
let currentUser = null;
let currentGroupId = null;
let currentGroupData = null; 
let unsubscribe = null; 
let replyingToMessage = null;
let editGroupImageFile = null; 

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
                window.location.href = 'index.html'; 
                return;
            }
            
            const groupDocRef = doc(db, "groups", currentGroupId);
            onSnapshot(groupDocRef, (groupDoc) => {
                if (groupDoc.exists()) {
                    currentGroupData = groupDoc.data();
                    updateChatHeader(); 
                } else {
                     alert("Error: This group does not exist.");
                     window.location.href = 'index.html';
                }
            });
            
            backButton.href = 'index.html'; 
            listenForMessages(currentGroupId);
            setupModalListeners(); 

        } else {
            window.location.href = '/login/';
        }
    });
}

// Update Chat Header
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

// Listen for Messages
function listenForMessages(groupId) {
    if (unsubscribe) unsubscribe(); 

    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    unsubscribe = onSnapshot(q, (snapshot) => {
        messageArea.innerHTML = ''; 
        
        snapshot.docs.forEach((doc) => {
            const messageData = { id: doc.id, ...doc.data() };
            renderMessage(messageData); 
        });
        
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100); 
    }, (error) => {
        console.error("Error fetching messages:", error);
        messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
    });
}

// Format Time Helper
function formatMessageTime(timestamp) {
    if (!timestamp) {
        return ''; 
    }
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Reply UI logic
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

// Render a single message
function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === currentUser.uid;
    if (isOwnMessage) {
        messageDiv.classList.add('own-message');
    }

    const avatar = data.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(data.userName || 'U').charAt(0)}`;
    
    let replyQuoteHTML = '';
    if (data.repliedToMessageId) {
        replyQuoteHTML = `
            <div class="reply-quote">
                <div class="reply-quote-sender">${data.repliedToSender || '...'}</div>
                <div class="reply-quote-text">${data.repliedToText || '...'}</div>
            </div>
        `;
    }

    const messageTime = formatMessageTime(data.createdAt);
    const sentTick = isOwnMessage ? '<i class="fas fa-check message-tick"></i>' : '';
    const timeMetaHTML = `
        <div class="message-meta">
            <span class="message-time">${messageTime}</span>
            ${sentTick}
        </div>
    `;

    let messageBubbleHTML = '';
    if (data.type === 'image' && data.imageData) {
        messageBubbleHTML = `
            <p class="message-bubble message-image">
                <img src="${data.imageData}" alt="User image" loading="lazy">
                ${timeMetaHTML}
            </p>
        `;
    } else {
        messageBubbleHTML = `
            <p class="message-bubble">
                <span class="message-text">${data.text || ''}</span>
                ${timeMetaHTML}
            </p>
        `;
    }

    const senderName = isOwnMessage ? '' : `
        <a href="../profile.html?sellerId=${data.userId}" class="message-profile-link" style="text-decoration:none;">
            <div class="message-sender">${data.userName}</div>
        </a>
    `;
    
    const avatarHTML = isOwnMessage ? '' : `
        <a href="../profile.html?sellerId=${data.userId}" class="message-profile-link">
            <img src="${avatar}" alt="${data.userName}" class="message-avatar">
        </a>
    `;

    messageDiv.innerHTML = `
        ${avatarHTML} 
        <div class="message-content">
            <div class="message-bubble-wrapper">
                ${senderName}
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

// --- Form and Message Sending ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser && currentGroupId) {
        const newMessage = {
            type: "text", 
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

// Image Upload (in-chat)
imageUploadBtn.addEventListener('click', () => {
    imageUploadInput.click();
});

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) { 
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


// --- Reply Logic ---
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

// --- Cloudinary Upload Function (for Group Profile Images) ---
async function uploadImageToCloudinary(file) {
    try {
        const response = await fetch('/.netlify/functions/generate-group-signature');
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

// --- File Preview Logic (for Edit Modal) ---
function handleEditFilePreview(file) {
    editGroupImageFile = file; 
    
    const reader = new FileReader();
    reader.onload = (e) => {
        editGroupImagePreviewContainer.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${e.target.result}" alt="Image preview" class="image-preview-img">
                <button type="button" class="remove-image-btn" id="remove-edit-group-image-btn">&times;</button>
            </div>
        `;
        editGroupImageUploadIcon.style.display = 'none';
        
        document.getElementById('remove-edit-group-image-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeEditFile(null); 
        });
    };
    reader.readAsDataURL(file);
}

function removeEditFile(currentImageUrl = null) {
    editGroupImageFile = null;
    editGroupImageInput.value = null; 
    
    if (currentImageUrl) {
        editGroupImagePreviewContainer.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${currentImageUrl}" alt="Current group image" class="image-preview-img">
            </div>
        `;
        editGroupImageUploadIcon.style.display = 'none';
    } else {
        editGroupImagePreviewContainer.innerHTML = ''; 
        editGroupImageUploadIcon.style.display = 'block';
    }
}

// --- NEW: Toast Notification Helper ---
function showToast(message) {
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

// --- Group Details Modal Logic (UPDATED) ---
function setupModalListeners() {
    // Open Details Modal
    chatHeaderInfo.addEventListener('click', () => {
        if (!currentGroupData) return;
        
        modalGroupName.textContent = currentGroupData.name;
        modalGroupDescription.textContent = currentGroupData.description;
        
        if (currentGroupData.imageUrl) {
            modalGroupImg.src = currentGroupData.imageUrl;
        } else {
            modalGroupImg.src = `https://placehold.co/150x150/10336d/a7c0e8?text=${(currentGroupData.name || 'G').charAt(0)}`;
        }
        
        if (currentUser.uid === currentGroupData.createdBy) {
            modalEditBtn.style.display = 'block';
        } else {
            modalEditBtn.style.display = 'none';
        }
        
        groupDetailsModal.classList.add('active');
        fetchGroupMembers(currentGroupData.members);
    });

    // Close Details Modal
    modalCloseBtn.addEventListener('click', () => {
        groupDetailsModal.classList.remove('active');
    });

    // --- NEW: Share Button Logic ---
    shareGroupBtn.addEventListener('click', async () => {
        const shareUrl = `https://kabaleonline.com/group/chat.html?groupId=${currentGroupId}`;
        const shareData = {
            title: `Join ${currentGroupData.name} on Kabale Online`,
            text: `Check out this group: ${currentGroupData.description}`,
            url: shareUrl
        };

        try {
            // Use Web Share API (on mobile)
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for PC: Copy to clipboard
                await navigator.clipboard.writeText(shareUrl);
                showToast("Link copied to clipboard!");
            }
        } catch (err) {
            console.error('Error sharing:', err);
            // Fallback if even clipboard fails
            navigator.clipboard.writeText(shareUrl);
            showToast("Link copied to clipboard!");
        }
    });

    // --- Edit Group Modal Logic ---
    modalEditBtn.addEventListener('click', () => {
        editGroupNameInput.value = currentGroupData.name;
        editGroupDescInput.value = currentGroupData.description;
        editModalError.style.display = 'none';
        removeEditFile(currentGroupData.imageUrl); 
        editGroupModal.classList.add('active');
    });

    closeEditModalBtn.addEventListener('click', () => {
        editGroupModal.classList.remove('active');
    });

    editGroupImageUploadArea.addEventListener('click', () => {
        editGroupImageInput.click();
    });

    editGroupImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleEditFilePreview(e.target.files[0]);
        }
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
            let newImageUrl = null;
            
            if (editGroupImageFile) {
                editGroupSubmit.textContent = "Uploading image...";
                newImageUrl = await uploadImageToCloudinary(editGroupImageFile);
            }

            const updateData = {
                name: newName,
                description: newDesc
            };
            
            if (newImageUrl) {
                updateData.imageUrl = newImageUrl;
            }

            const groupDocRef = doc(db, "groups", currentGroupId);
            await updateDoc(groupDocRef, updateData);
            
            editGroupModal.classList.remove('active');
            removeEditFile(); 
            
        } catch (error) {
            console.error("Error updating group:", error);
            editModalError.textContent = error.message || "Could not save. Please try again.";
            editModalError.style.display = 'block';
        } finally {
            editGroupSubmit.disabled = false;
            editGroupSubmit.textContent = "Save Changes";
        }
    });
}

// --- NEW: Remove Member Logic ---
async function handleRemoveMember(userIdToRemove, userName) {
    if (!confirm(`Are you sure you want to remove ${userName} from the group?`)) {
        return;
    }

    try {
        const groupDocRef = doc(db, "groups", currentGroupId);
        const userDocRef = doc(db, "users", userIdToRemove);

        // Remove from both group's member list and user's followed list
        await updateDoc(groupDocRef, {
            members: arrayRemove(userIdToRemove)
        });
        await updateDoc(userDocRef, {
            followedGroups: arrayRemove(currentGroupId)
        });
        
        showToast(`${userName} has been removed.`);
        // The onSnapshot listener for the groupDoc will trigger and re-render the member list
    } catch (error) {
        console.error("Error removing member:", error);
        showToast("Failed to remove member. Please try again.");
    }
}

// --- Fetch and Render Group Members (UPDATED) ---
async function fetchGroupMembers(memberIds) {
    modalMembersList.innerHTML = ''; 
    modalMembersLoader.style.display = 'block';

    const isAdmin = currentUser.uid === currentGroupData.createdBy;

    try {
        const userPromises = memberIds.map(id => getDoc(doc(db, "users", id)));
        const userDocs = await Promise.all(userPromises);
        
        modalMembersList.innerHTML = ''; 
        
        userDocs.forEach(userDoc => {
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const memberDiv = document.createElement('div');
                memberDiv.className = 'member-item';
                
                const avatar = userData.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
                const role = userDoc.id === currentGroupData.createdBy ? '<span class="member-role">Admin</span>' : '';
                
                // --- NEW: Show Remove button for Admin ---
                let removeBtnHTML = '';
                if (isAdmin && userDoc.id !== currentUser.uid) {
                    removeBtnHTML = `<button class="remove-member-btn" data-user-id="${userDoc.id}" data-user-name="${userData.name || 'User'}">Remove</button>`;
                }
                
                memberDiv.innerHTML = `
                    <a href="../profile.html?sellerId=${userDoc.id}" class="message-profile-link" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 15px; width: 100%;">
                        <img src="${avatar}" alt="${userData.name}" class="member-avatar">
                        <span class="member-name">${userData.name || 'User'}</span>
                        ${role}
                    </a>
                    ${removeBtnHTML}
                `;
                modalMembersList.appendChild(memberDiv);
            }
        });

        // --- NEW: Add click listeners for all remove buttons ---
        modalMembersList.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = e.target.dataset.userId;
                const userName = e.target.dataset.userName;
                handleRemoveMember(userId, userName);
            });
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