// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//      CHAT ROOM SCRIPT (chat.js) - *ALL FEATURES ADDED* (FIXED)      //
//         Fix: ensure members are added to groups/{groupId}/members   //
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
    setDoc,
    limit,
    where,
    arrayRemove,
    deleteDoc,
    arrayUnion 
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
const shareGroupBtn = document.getElementById('share-group-btn'); 
const toastNotification = document.getElementById('toast-notification'); 

// Edit Group Modal Elements
const editGroupModal = document.getElementById('edit-group-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editGroupForm = document.getElementById('edit-group-form');
const editGroupSubmit = document.getElementById('edit-group-submit');
const editGroupNameInput = document.getElementById('edit-group-name');
const editGroupDescInput = document.getElementById('edit-group-description');
const editModalError = document.getElementById('edit-modal-error');
const editGroupCategorySelect = document.getElementById('edit-group-category'); 

// Edit Group Image Elements
const editGroupImageUploadArea = document.getElementById('edit-group-image-upload-area');
const editGroupImageInput = document.getElementById('edit-group-image-input');
const editGroupImagePreviewContainer = document.getElementById('edit-group-image-preview-container');
const editGroupImageUploadIcon = document.getElementById('edit-group-image-upload-icon');

// NEW: Image Popup Elements
const imagePopupModal = document.getElementById('image-popup-modal');
const popupImage = document.getElementById('popup-image');
const closeImagePopup = document.getElementById('close-image-popup');

// NEW: Leave Group Elements
const leaveGroupBtn = document.getElementById('leave-group-btn');
const dangerZoneSection = document.getElementById('danger-zone-section');

// NEW: Edit Message Modal Elements
const editMessageModal = document.getElementById('edit-message-modal');
const editMessageForm = document.getElementById('edit-message-form');
const editMessageInput = document.getElementById('edit-message-input');
const editMessageIdInput = document.getElementById('edit-message-id-input');
const editMessageSubmit = document.getElementById('edit-message-submit');
const closeEditMessageModalBtn = document.getElementById('close-edit-message-modal-btn');

// --- Global State ---
let currentUser = null;
let currentGroupId = null;
let currentGroupData = null; 
let unsubscribe = null; 
let groupDocUnsub = null;
let replyingToMessage = null;
let editGroupImageFile = null; 
let isUserAdmin = false; // NEW: To check admin status quickly

// --- Helper UI: Join Banner Node (created on demand) ---
function createJoinBanner() {
    const banner = document.createElement('div');
    banner.id = 'join-banner';
    banner.style.cssText = 'padding:12px; text-align:center; background:#fff6e5; border:1px solid #ffd89b; margin:8px; border-radius:8px;';
    banner.innerHTML = `
        <div style="margin-bottom:8px;">You are not a member of this group. Join to see messages and participate.</div>
        <div style="display:flex; gap:8px; justify-content:center;">
            <button id="join-group-btn" style="padding:8px 12px; border-radius:6px; border: none; cursor:pointer;">Join Group</button>
            <button id="cancel-join-btn" style="padding:8px 12px; border-radius:6px; border:1px solid #ccc; background:#fff; cursor:pointer;">Cancel</button>
        </div>
    `;
    return banner;
}

function removeJoinBanner() {
    const b = document.getElementById('join-banner');
    if (b) b.remove();
}

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

            backButton.href = 'index.html'; 
            setupModalListeners(); // Set up modal logic

            // Subscribe to group doc and react to membership changes
            const groupDocRef = doc(db, "groups", currentGroupId);
            if (groupDocUnsub) groupDocUnsub();
            groupDocUnsub = onSnapshot(groupDocRef, (groupDoc) => {
                if (groupDoc.exists()) {
                    currentGroupData = groupDoc.data();

                    // Ensure admins array exists, default to empty
                    if (!currentGroupData.admins) {
                        currentGroupData.admins = [];
                    }
                    if (!currentGroupData.members) {
                        currentGroupData.members = [];
                    }

                    // Check if user is an admin
                    isUserAdmin = currentGroupData.admins.includes(currentUser.uid) || 
                                  currentGroupData.createdBy === currentUser.uid;

                    updateChatHeader(); // Update UI

                    // If user is a member -> start listening for messages
                    const isMember = currentGroupData.members.includes(currentUser.uid);
                    if (isMember) {
                        removeJoinBanner();
                        if (!unsubscribe) {
                            listenForMessages(currentGroupId);
                        }
                    } else {
                        // not a member -> show join banner and stop listening to messages
                        if (unsubscribe) {
                            unsubscribe();
                            unsubscribe = null;
                        }
                        showJoinPrompt();
                        // also clear current message area so user doesn't see stale content
                        messageArea.innerHTML = `<p style="padding: 20px; text-align:center;">You are not a member of this group. Join to view messages.</p>`;
                    }

                } else {
                     alert("Error: This group no longer exists."); // Changed message
                     window.location.href = 'index.html';
                }
            }, (err) => {
                console.error("Group doc listener error:", err);
                messageArea.innerHTML = `<p style="padding: 20px; text-align:center;">Could not load group information.</p>`;
            });

        } else {
            // User is not logged in, redirect to group list
            window.location.href = 'index.html';
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

// Listen for Messages (only call this when user is confirmed a member)
function listenForMessages(groupId) {
    if (unsubscribe) return; 

    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    unsubscribe = onSnapshot(q, (snapshot) => {
        messageArea.innerHTML = ''; // Clear the chat area *every* time

        snapshot.docs.forEach((docSnap) => {
            const messageData = { id: docSnap.id, ...docSnap.data() };
            renderMessage(messageData); // Render *all* messages in order
        });

        // Scroll to bottom
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100); 
    }, (error) => {
        console.error("Error fetching messages:", error);
        messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages. You may not be a member of this group.</p>`;
        showJoinPrompt();
    });
}

// --- Helper: show join prompt inside chat area ---
function showJoinPrompt() {
    removeJoinBanner(); // clear duplicates
    const banner = createJoinBanner();
    // put banner at top of messageArea
    if (messageArea.firstChild) {
        messageArea.insertBefore(banner, messageArea.firstChild);
    } else {
        messageArea.appendChild(banner);
    }

    // add listeners to the buttons
    const joinBtn = document.getElementById('join-group-btn');
    const cancelBtn = document.getElementById('cancel-join-btn');

    if (joinBtn) {
        joinBtn.addEventListener('click', async () => {
            joinBtn.disabled = true;
            joinBtn.textContent = "Joining...";
            try {
                await joinGroup(currentGroupId);
                showToast("Joined group successfully.");
                // onSnapshot for group doc will detect membership and start message listener
            } catch (err) {
                console.error("Join failed:", err);
                showToast("Failed to join group. Try again.");
            } finally {
                joinBtn.disabled = false;
                joinBtn.textContent = "Join Group";
            }
        }, { once: true });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            removeJoinBanner();
        }, { once: true });
    }
}

// --- Join Group: Adds user to groups/{groupId}.members and adds subcollection doc AND adds group to users/{uid}.followedGroups
async function joinGroup(groupId) {
    if (!currentUser || !groupId) throw new Error("Missing user or group.");

    const groupDocRef = doc(db, "groups", groupId);
    const userDocRef = doc(db, "users", currentUser.uid);
    const memberDocRef = doc(db, "groups", groupId, "members", currentUser.uid);

    try {
        // Add user UID to group's members array (for quick membership lists)
        await updateDoc(groupDocRef, {
            members: arrayUnion(currentUser.uid)
        });

        // Create membership document in subcollection so security rules that check for existence pass
        await setDoc(memberDocRef, {
            userId: currentUser.uid,
            displayName: currentUser.name || currentUser.uid,
            joinedAt: serverTimestamp(),
            role: "member"
        });

        // Add group to user's followedGroups (create field if missing)
        await updateDoc(userDocRef, {
            followedGroups: arrayUnion(groupId)
        });

    } catch (err) {
        console.error("Error joining group:", err);
        // fallback checks
        const groupSnap = await getDoc(groupDocRef);
        if (!groupSnap.exists()) {
            throw new Error("Group no longer exists.");
        } else {
            throw err;
        }
    }
}

// --- NEW: Helper Function to Format Time ---
function formatMessageTime(timestamp) {
    if (!timestamp) {
        return ''; // Handle pending server timestamps
    }
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// --- Reply UI logic ---
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

// --- Renders Messages with Actions ---
function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === currentUser.uid;
    if (isOwnMessage) {
        messageDiv.classList.add('own-message');
    }

    const avatar = data.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(data.userName || 'U').charAt(0)}`;

    // Reply Quote
    let replyQuoteHTML = '';
    if (data.repliedToMessageId) {
        replyQuoteHTML = `
            <div class="reply-quote">
                <div class="reply-quote-sender">${data.repliedToSender || '...'}</div>
                <div class="reply-quote-text">${data.repliedToText || '...'}</div>
            </div>
        `;
    }

    // Time & Tick
    const messageTime = formatMessageTime(data.createdAt);
    const sentTick = isOwnMessage ? '<i class="fas fa-check message-tick"></i>' : '';
    const timeMetaHTML = `
        <div class="message-meta">
            <span class="message-time">${messageTime}</span>
            ${sentTick}
        </div>
    `;

    // Message Bubble
    let messageBubbleHTML = '';
    if (data.type === 'image' && data.imageData) {
        messageBubbleHTML = `
            <div class="message-bubble message-image">
                <img src="${data.imageData}" alt="User image" loading="lazy">
                ${timeMetaHTML}
            </div>
        `;
    } else {
        messageBubbleHTML = `
            <div class="message-bubble">
                <span class="message-text">${data.text || ''}</span>
                ${timeMetaHTML}
            </div>
        `;
    }

    // Sender Name (with link)
    const senderName = isOwnMessage ? '' : `
        <a href="../profile.html?sellerId=${data.userId}" class="message-profile-link" style="text-decoration:none;">
            <div class="message-sender">${data.userName}</div>
        </a>
    `;

    // Message action buttons
    const canEdit = isOwnMessage &&
                    data.type === 'text' &&
                    isMessageRecent(data.createdAt);

    const editBtnHTML = canEdit ? `
        <button class="message-action-btn edit-btn" title="Edit"
                data-id="${data.id}"
                data-text="${(data.text || '').replace(/"/g, '&quot;')}">
            <i class="fas fa-pen"></i>
        </button>
    ` : '';

    const deleteBtnHTML = isUserAdmin ? `
        <button class="message-action-btn delete-btn" title="Delete" data-id="${data.id}">
            <i class="fas fa-trash"></i>
        </button>
    ` : '';

    const replyBtnHTML = `
        <button class="message-action-btn reply-btn" title="Reply"
                data-id="${data.id}"
                data-sender="${data.userName || ''}"
                data-text="${(data.text || 'Image').replace(/"/g, '&quot;')}">
            <i class="fas fa-reply"></i>
        </button>
    `;

    const actionsHTML = `
        <div class="message-actions">
            ${replyBtnHTML}
            ${editBtnHTML}
            ${deleteBtnHTML}
        </div>
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
            ${actionsHTML}
        </div>
    `;

    messageArea.appendChild(messageDiv);
}

// --- Helper function to check if a message is recent ---
function isMessageRecent(timestamp) {
    if (!timestamp) return false;
    const messageTime = timestamp.toDate().getTime();
    const now = new Date().getTime();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    return (now - messageTime) < FIFTEEN_MINUTES;
}

// --- Edit Message Functions ---
function openEditMessageModal(messageId, currentText) {
    editMessageInput.value = currentText;
    editMessageIdInput.value = messageId; // Store the ID in a hidden input
    editMessageModal.classList.add('active');
    editMessageInput.focus();
}

function closeEditMessageModal() {
    editMessageModal.classList.remove('active');
}

async function handleEditMessageSubmit(e) {
    e.preventDefault();
    const newText = editMessageInput.value.trim();
    const messageId = editMessageIdInput.value;

    if (!newText || !messageId) return;

    editMessageSubmit.disabled = true;
    editMessageSubmit.textContent = "Saving...";

    try {
        const messageRef = doc(db, "groups", currentGroupId, "messages", messageId);
        await updateDoc(messageRef, {
            text: newText
        });
        closeEditMessageModal();
    } catch (error) {
        console.error("Error editing message:", error);
    } finally {
        editMessageSubmit.disabled = false;
        editMessageSubmit.textContent = "Save Changes";
    }
}

// --- Delete Message Function ---
async function handleDeleteMessage(messageId) {
    if (!confirm("Are you sure you want to delete this message? This cannot be undone.")) {
        return;
    }

    try {
        const messageRef = doc(db, "groups", currentGroupId, "messages", messageId);
        await deleteDoc(messageRef);
        // The onSnapshot listener will handle the UI update
    } catch (error) {
        console.error("Error deleting message:", error);
        showToast("Failed to delete message.");
    }
}

// --- Form submit (Text) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser && currentGroupId) {
        // ensure user is a member - double check
        if (!currentGroupData || !currentGroupData.members || !currentGroupData.members.includes(currentUser.uid)) {
            showToast("You must join the group before sending messages.");
            return;
        }

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
            showToast("Failed to send message.");
        }
    }
});

// --- Image Upload ---
imageUploadBtn.addEventListener('click', () => {
    imageUploadInput.click();
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

    // ensure membership
    if (!currentGroupData || !currentGroupData.members || !currentGroupData.members.includes(currentUser.uid)) {
        showToast("You must join the group before sending images.");
        return;
    }

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
        console.error("Error sending image message:", error);
        showToast("Failed to send image.");
    }
}

// --- Event Listener for Actions ---
messageArea.addEventListener('click', (e) => {

    // --- Image Popup ---
    const clickedImage = e.target.closest('.message-image img');
    if (clickedImage) {
        openImagePopup(clickedImage.src);
    }

    // --- Reply Button ---
    const replyButton = e.target.closest('.reply-btn');
    if (replyButton) {
        replyingToMessage = {
            id: replyButton.dataset.id,
            sender: replyButton.dataset.sender,
            text: replyButton.dataset.text
        };
        updateReplyUI();
    }

    // --- NEW: Edit Button ---
    const editButton = e.target.closest('.edit-btn');
    if (editButton) {
        openEditMessageModal(editButton.dataset.id, editButton.dataset.text);
    }

    // --- NEW: Delete Button ---
    const deleteButton = e.target.closest('.delete-btn');
    if (deleteButton) {
        handleDeleteMessage(deleteButton.dataset.id);
    }
});

// --- NEW: Add Edit Message Modal Listeners ---
editMessageForm.addEventListener('submit', handleEditMessageSubmit);
closeEditMessageModalBtn.addEventListener('click', closeEditMessageModal);


cancelReplyBtn.addEventListener('click', () => {
    replyingToMessage = null;
    updateReplyUI();
});

// --- NEW: Image Popup Logic ---
function openImagePopup(src) {
    popupImage.src = src;
    imagePopupModal.style.display = 'flex';
}

function closeImagePopupFunction() {
    imagePopupModal.style.display = 'none';
    popupImage.src = ''; // Clear src to stop loading
}

// Close modal listeners
closeImagePopup.addEventListener('click', closeImagePopupFunction);
imagePopupModal.addEventListener('click', (e) => {
    // Close if the user clicks on the dark background, but not the image itself
    if (e.target === imagePopupModal) {
        closeImagePopupFunction();
    }
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

// --- Toast Notification Helper ---
function showToast(message) {
    if (!toastNotification) {
        console.log("Toast:", message);
        return;
    }
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

// --- Group Details Modal Logic ---
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

        // ▼▼▼ UPDATED ADMIN/MEMBER BUTTON LOGIC ▼▼▼
        if (currentUser.uid === currentGroupData.createdBy) {
            modalEditBtn.style.display = 'block';
            dangerZoneSection.style.display = 'none'; // Creator can't leave
        } else if (isUserAdmin) {
            modalEditBtn.style.display = 'block'; // Other admins can edit
            dangerZoneSection.style.display = 'block'; // Other admins *can* leave
        }
        else {
            modalEditBtn.style.display = 'none';
            dangerZoneSection.style.display = 'block'; // Members can leave
        }
        // ▲▲▲ END UPDATE ▲▲▲

        groupDetailsModal.classList.add('active');
        fetchGroupMembers(currentGroupData.members || []);
    });

    // Close Details Modal
    modalCloseBtn.addEventListener('click', () => {
        groupDetailsModal.classList.remove('active');
    });

    // --- Share Button Logic ---
    shareGroupBtn.addEventListener('click', async () => {
        const shareUrl = `https://kabaleonline.com/group/chat.html?groupId=${currentGroupId}`;
        const shareData = {
            title: `Join ${currentGroupData.name} on Kabale Online`,
            text: `Check out this group: ${currentGroupData.description}`,
            url: shareUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showToast("Link copied to clipboard!");
            }
        } catch (err) {
            console.error('Error sharing:', err);
            navigator.clipboard.writeText(shareUrl);
            showToast("Link copied to clipboard!");
        }
    });

    // --- NEW: Add Leave Group Listener ---
    leaveGroupBtn.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to leave this group?")) {
            return;
        }

        try {
            const groupDocRef = doc(db, "groups", currentGroupId);
            const userDocRef = doc(db, "users", currentUser.uid);
            const memberDocRef = doc(db, "groups", currentGroupId, "members", currentUser.uid);

            await updateDoc(groupDocRef, {
                members: arrayRemove(currentUser.uid),
                admins: arrayRemove(currentUser.uid) // Also remove from admin list if they are one
            });

            // remove subcollection membership doc as well
            await deleteDoc(memberDocRef).catch(err => {
                // ignore if doesn't exist
            });

            await updateDoc(userDocRef, {
                followedGroups: arrayRemove(currentGroupId)
            });

            showToast("You have left the group.");
            window.location.href = 'index.html'; // Go back to group list

        } catch (error) {
            console.error("Error leaving group:", error);
            showToast("Failed to leave group. Please try again.");
        }
    });


    // --- Edit Group Modal Logic ---
    modalEditBtn.addEventListener('click', () => {
        editGroupNameInput.value = currentGroupData.name;
        editGroupDescInput.value = currentGroupData.description;
        editGroupCategorySelect.value = currentGroupData.category || ""; // Pre-fill category
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
        const newCategory = editGroupCategorySelect.value; 

        if (!newName || !newCategory) { 
            editModalError.textContent = "Name and category are required.";
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
                description: newDesc,
                category: newCategory 
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

// --- Remove Member Logic ---
async function handleRemoveMember(userIdToRemove, userName) {
    if (!confirm(`Are you sure you want to remove ${userName} from the group?`)) {
        return;
    }

    try {
        const groupDocRef = doc(db, "groups", currentGroupId);
        const userDocRef = doc(db, "users", userIdToRemove);
        const memberDocRef = doc(db, "groups", currentGroupId, "members", userIdToRemove);

        await updateDoc(groupDocRef, {
            members: arrayRemove(userIdToRemove),
            admins: arrayRemove(userIdToRemove) // Also remove from admin list
        });

        // Remove member doc if present
        await deleteDoc(memberDocRef).catch(err => { /* ignore if not exist */ });

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

// --- Promote/Demote Admin Logic ---
async function handleAdminAction(userId, action) {
    const groupDocRef = doc(db, "groups", currentGroupId);

    try {
        if (action === 'promote') {
            await updateDoc(groupDocRef, {
                admins: arrayUnion(userId)
            });
            showToast("User promoted to admin.");
        } else if (action === 'demote') {
            await updateDoc(groupDocRef, {
                admins: arrayRemove(userId)
            });
            showToast("User demoted from admin.");
        }
        // The onSnapshot listener will auto-update the UI
    } catch (error) {
        console.error("Error updating admin status:", error);
        showToast("Failed to update status. Please try again.");
    }
}

// --- Fetch and Render Group Members ---
async function fetchGroupMembers(memberIds) {
    modalMembersList.innerHTML = ''; 
    modalMembersLoader.style.display = 'block';

    const isSuperAdmin = currentUser.uid === currentGroupData.createdBy;

    try {
        const userPromises = (memberIds || []).map(id => getDoc(doc(db, "users", id)));
        const userDocs = await Promise.all(userPromises);

        modalMembersList.innerHTML = ''; 

        userDocs.forEach(userDoc => {
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const memberDiv = document.createElement('div');
                memberDiv.className = 'member-item';

                const memberId = userDoc.id;
                const isCreator = memberId === currentGroupData.createdBy;
                const isGroupAdmin = currentGroupData.admins.includes(memberId) || isCreator;

                const avatar = userData.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(userData.name || 'U').charAt(0)}`;
                const role = isGroupAdmin ? `<span class="member-role">Admin</span>` : '';

                let actionBtnsHTML = '';

                // Super Admin (Creator) can manage admins and remove anyone
                if (isSuperAdmin && memberId !== currentUser.uid) {
                    if (isGroupAdmin) {
                        if (!isCreator) {
                            actionBtnsHTML += `<button class="admin-action-btn demote-btn" data-user-id="${memberId}">Demote</button>`;
                        }
                    } else {
                        actionBtnsHTML += `<button class="admin-action-btn" data-user-id="${memberId}">Promote</button>`;
                    }
                    actionBtnsHTML += `<button class="remove-member-btn" data-user-id="${memberId}" data-user-name="${userData.name || 'User'}">Remove</button>`;

                // Regular Admins can only remove non-admins
                } else if (isUserAdmin && !isSuperAdmin && !isGroupAdmin && memberId !== currentUser.uid) {
                    actionBtnsHTML += `<button class="remove-member-btn" data-user-id="${memberId}" data-user-name="${userData.name || 'User'}">Remove</button>`;
                }

                memberDiv.innerHTML = `
                    <a href="../profile.html?sellerId=${memberId}" class="message-profile-link" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 15px; width: 100%;">
                        <img src="${avatar}" alt="${userData.name}" class="member-avatar">
                        <span class="member-name">${userData.name || 'User'}</span>
                        ${role}
                    </a>
                    <div style="display: flex; gap: 5px;">
                        ${actionBtnsHTML}
                    </div>
                `;
                modalMembersList.appendChild(memberDiv);
            }
        });

        // --- Add Listeners for Promote/Demote ---
        modalMembersList.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = e.target.dataset.userId;
                if (e.target.classList.contains('demote-btn')) {
                    handleAdminAction(userId, 'demote');
                } else {
                    handleAdminAction(userId, 'promote');
                }
            });
        });

        // --- This listener finds the remove buttons ---
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
    if (groupDocUnsub) {
        groupDocUnsub();
    }
});

// --- Run the main function ---
initializeChat();