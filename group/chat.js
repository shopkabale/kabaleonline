// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//      CHAT ROOM SCRIPT - *REACTIONS + LONG PRESS + PROFILE* //
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

// Image Popup Elements
const imagePopupModal = document.getElementById('image-popup-modal');
const popupImage = document.getElementById('popup-image');
const closeImagePopup = document.getElementById('close-image-popup');

// Leave Group Elements
const leaveGroupBtn = document.getElementById('leave-group-btn');
const dangerZoneSection = document.getElementById('danger-zone-section');

// Edit Message Modal Elements
const editMessageModal = document.getElementById('edit-message-modal');
const editMessageForm = document.getElementById('edit-message-form');
const editMessageInput = document.getElementById('edit-message-input');
const editMessageIdInput = document.getElementById('edit-message-id-input');
const editMessageSubmit = document.getElementById('edit-message-submit');
const closeEditMessageModalBtn = document.getElementById('close-edit-message-modal-btn');

// Complete Profile Modal Elements
const completeProfileModal = document.getElementById('complete-profile-modal');
const completeProfileForm = document.getElementById('complete-profile-form');
const profileFullNameInput = document.getElementById('profile-fullName-input');
const completeProfileSubmit = document.getElementById('complete-profile-submit');

// Context Menu Elements
const contextMenuOverlay = document.getElementById('context-menu-overlay');
const messageContextMenu = document.getElementById('message-context-menu');
const menuReplyBtn = document.getElementById('menu-reply-btn');
const menuEditBtn = document.getElementById('menu-edit-btn');
const menuDeleteBtn = document.getElementById('menu-delete-btn');
const reactionButtons = document.querySelectorAll('.reaction-btn'); // NEW

// --- Global State ---
let currentUser = null;
let currentGroupId = null;
let currentGroupData = null; 
let unsubscribe = null; 
let groupDocUnsub = null;
let replyingToMessage = null;
let editGroupImageFile = null; 
let isUserAdmin = false;

// Context Menu State
let longPressTimer = null;
let activeMessageData = null;

// --- Helper UI: Join Banner Node ---
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
                name: userDoc.data().fullName, 
                profilePicUrl: userDoc.data().profilePicUrl
            };

            if (!currentUser.name || currentUser.name.trim() === "") {
                completeProfileModal.style.display = 'flex';
                completeProfileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const newName = profileFullNameInput.value.trim();
                    if (!newName) return;
                    completeProfileSubmit.disabled = true;
                    completeProfileSubmit.textContent = "Saving...";
                    try {
                        await updateDoc(doc(db, "users", currentUser.uid), {
                            fullName: newName
                        });
                        currentUser.name = newName;
                        completeProfileModal.style.display = 'none';
                        proceedWithChatInitialization();
                    } catch (err) {
                        console.error("Error updating profile:", err);
                        alert("Could not update profile. Please try again.");
                        completeProfileSubmit.disabled = false;
                        completeProfileSubmit.textContent = "Save and Join Chat";
                    }
                });
            } else {
                proceedWithChatInitialization();
            }
        } else {
            window.location.href = 'index.html';
        }
    });
}

// --- Chat Logic (Post-Auth) ---
async function proceedWithChatInitialization() {
    const urlParams = new URLSearchParams(window.location.search);
    currentGroupId = urlParams.get('groupId');

    if (!currentGroupId) {
        alert("Error: No group ID specified.");
        window.location.href = 'index.html';
        return;
    }

    backButton.href = 'index.html'; 
    setupModalListeners(); 

    const groupDocRef = doc(db, "groups", currentGroupId);
    if (groupDocUnsub) groupDocUnsub();
    groupDocUnsub = onSnapshot(groupDocRef, (groupDoc) => {
        if (groupDoc.exists()) {
            currentGroupData = groupDoc.data();
            if (!currentGroupData.admins) currentGroupData.admins = [];
            if (!currentGroupData.members) currentGroupData.members = [];

            isUserAdmin = currentGroupData.admins.includes(currentUser.uid) || 
                          currentGroupData.createdBy === currentUser.uid;

            updateChatHeader(); 

            const isMember = currentGroupData.members.includes(currentUser.uid);
            if (isMember) {
                removeJoinBanner();
                if (!unsubscribe) {
                    listenForMessages(currentGroupId);
                }
            } else {
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
                showJoinPrompt();
                messageArea.innerHTML = `<p style="padding: 20px; text-align:center;">You are not a member of this group. Join to view messages.</p>`;
            }
        } else {
             alert("Error: This group no longer exists.");
             window.location.href = 'index.html';
        }
    }, (err) => {
        console.error("Group doc listener error:", err);
        messageArea.innerHTML = `<p style="padding: 20px; text-align:center;">Could not load group information.</p>`;
    });

    setupContextMenuListeners();
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
    if (unsubscribe) return; 
    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));
    unsubscribe = onSnapshot(q, (snapshot) => {
        messageArea.innerHTML = ''; 
        snapshot.docs.forEach((docSnap) => {
            const messageData = { id: docSnap.id, ...docSnap.data() };
            renderMessage(messageData); 
        });
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100); 
    }, (error) => {
        console.error("Error fetching messages:", error);
        messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
        showJoinPrompt();
    });
}

// --- Join Group Logic ---
function showJoinPrompt() {
    removeJoinBanner(); 
    const banner = createJoinBanner();
    if (messageArea.firstChild) {
        messageArea.insertBefore(banner, messageArea.firstChild);
    } else {
        messageArea.appendChild(banner);
    }
    const joinBtn = document.getElementById('join-group-btn');
    const cancelBtn = document.getElementById('cancel-join-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', async () => {
            joinBtn.disabled = true;
            joinBtn.textContent = "Joining...";
            try {
                await joinGroup(currentGroupId);
                showToast("Joined group successfully.");
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

async function joinGroup(groupId) {
    if (!currentUser || !groupId) throw new Error("Missing user or group.");
    const groupDocRef = doc(db, "groups", groupId);
    const userDocRef = doc(db, "users", currentUser.uid);
    const memberDocRef = doc(db, "groups", groupId, "members", currentUser.uid);
    try {
        await updateDoc(groupDocRef, {
            members: arrayUnion(currentUser.uid)
        });
        await setDoc(memberDocRef, {
            userId: currentUser.uid,
            displayName: currentUser.name || currentUser.uid,
            joinedAt: serverTimestamp(),
            role: "member"
        });
        await updateDoc(userDocRef, {
            followedGroups: arrayUnion(groupId)
        });
    } catch (err) {
        console.error("Error joining group:", err);
        const groupSnap = await getDoc(groupDocRef);
        if (!groupSnap.exists()) {
            throw new Error("Group no longer exists.");
        } else {
            throw err;
        }
    }
}

// --- Format Time ---
function formatMessageTime(timestamp) {
    if (!timestamp) return '';
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

// --- **MODIFIED** Renders Messages with Reactions ---
function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === currentUser.uid;
    if (isOwnMessage) {
        messageDiv.classList.add('own-message');
    }

    messageDiv.dataset.id = data.id;
    messageDiv.dataset.userId = data.userId;
    messageDiv.dataset.userName = data.userName || '';
    messageDiv.dataset.text = data.text || (data.type === 'image' ? 'Image' : '');
    messageDiv.dataset.type = data.type || 'text';
    if (data.createdAt) {
        messageDiv.dataset.timestamp = data.createdAt.toMillis();
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

    // --- NEW: Reaction Logic ---
    let reactionsHTML = '';
    let hasReactions = false;
    if (data.reactions && Object.keys(data.reactions).length > 0) {
        reactionsHTML = '<div class="reactions-container">';
        for (const [emoji, userIds] of Object.entries(data.reactions)) {
            if (userIds && userIds.length > 0) {
                hasReactions = true;
                reactionsHTML += `
                    <div class="reaction-pill">
                        <span class="reaction-emoji">${emoji}</span>
                        <span class="reaction-count">${userIds.length}</span>
                    </div>
                `;
            }
        }
        reactionsHTML += '</div>';
    }
    // --- END NEW ---

    // Message Bubble
    let messageBubbleHTML = '';
    if (data.type === 'image' && data.imageData) {
        messageBubbleHTML = `
            <div class="message-bubble message-image ${hasReactions ? 'has-reactions' : ''}">
                <img src="${data.imageData}" alt="User image" loading="lazy">
                ${timeMetaHTML}
                ${reactionsHTML} </div>
        `;
    } else {
        messageBubbleHTML = `
            <div class="message-bubble ${hasReactions ? 'has-reactions' : ''}">
                <span class="message-text">${data.text || ''}</span>
                ${timeMetaHTML}
                ${reactionsHTML} </div>
        `;
    }
    
    // Sender Name
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
        </div>
    `;

    messageArea.appendChild(messageDiv);
}

// --- Helper function to check if a message is recent ---
function isMessageRecent(timestamp) {
    if (!timestamp) return false;
    const messageTime = parseInt(timestamp, 10);
    const now = new Date().getTime();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    return (now - messageTime) < FIFTEEN_MINUTES;
}

// --- Edit Message Functions ---
function openEditMessageModal(messageId, currentText) {
    editMessageInput.value = currentText;
    editMessageIdInput.value = messageId;
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
        await updateDoc(messageRef, { text: newText });
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
            createdAt: serverTimestamp(),
            reactions: {} // NEW: Initialize reactions map
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
        createdAt: serverTimestamp(),
        reactions: {} // NEW: Initialize reactions map
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
        showToast("Failed to send image.");
    }
}

// --- Image Popup Click Listener ---
messageArea.addEventListener('click', (e) => {
    const clickedImage = e.target.closest('.message-image img');
    if (clickedImage) {
        openImagePopup(clickedImage.src);
    }
});

// --- Edit Message Modal Listeners ---
editMessageForm.addEventListener('submit', handleEditMessageSubmit);
closeEditMessageModalBtn.addEventListener('click', closeEditMessageModal);

// --- Cancel Reply Listener ---
cancelReplyBtn.addEventListener('click', () => {
    replyingToMessage = null;
    updateReplyUI();
});

// --- Image Popup Logic ---
function openImagePopup(src) {
    popupImage.src = src;
    imagePopupModal.style.display = 'flex';
}

function closeImagePopupFunction() {
    imagePopupModal.style.display = 'none';
    popupImage.src = '';
}

closeImagePopup.addEventListener('click', closeImagePopupFunction);
imagePopupModal.addEventListener('click', (e) => {
    if (e.target === imagePopupModal) {
        closeImagePopupFunction();
    }
});

// --- **UPDATED** Context Menu (Long Press) Logic ---
function setupContextMenuListeners() {
    messageArea.addEventListener('touchstart', handlePressStart, { passive: true });
    messageArea.addEventListener('touchend', handlePressEnd);
    messageArea.addEventListener('touchmove', handlePressEnd);
    messageArea.addEventListener('contextmenu', handleRightClick);

    contextMenuOverlay.addEventListener('click', hideContextMenu);
    
    menuReplyBtn.addEventListener('click', () => {
        if (!activeMessageData) return;
        replyingToMessage = {
            id: activeMessageData.id,
            sender: activeMessageData.userName,
            text: activeMessageData.text
        };
        updateReplyUI();
        hideContextMenu();
    });

    menuEditBtn.addEventListener('click', () => {
        if (!activeMessageData) return;
        openEditMessageModal(activeMessageData.id, activeMessageData.text);
        hideContextMenu();
    });

    menuDeleteBtn.addEventListener('click', () => {
        if (!activeMessageData) return;
        handleDeleteMessage(activeMessageData.id);
        hideContextMenu();
    });

    // --- NEW: Listeners for reaction buttons ---
    reactionButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!activeMessageData) return;
            const reaction = button.dataset.reaction;
            handleReaction(activeMessageData.id, reaction);
            hideContextMenu();
        });
    });
}

function handlePressStart(e) {
    clearTimeout(longPressTimer);
    const targetMessage = e.target.closest('.message');
    if (!targetMessage) return;
    longPressTimer = setTimeout(() => {
        showContextMenu(e, targetMessage);
    }, 500); 
}

function handlePressEnd() {
    clearTimeout(longPressTimer);
}

function handleRightClick(e) {
    e.preventDefault(); 
    const targetMessage = e.target.closest('.message');
    if (!targetMessage) return;
    showContextMenu(e, targetMessage);
}

function showContextMenu(e, targetMessage) {
    activeMessageData = { ...targetMessage.dataset };
    
    const isOwn = activeMessageData.userId === currentUser.uid;
    const canEdit = isOwn && 
                    activeMessageData.type === 'text' && 
                    isMessageRecent(activeMessageData.timestamp);
    
    // Admin can delete any, regular user can delete their own
    const canDelete = isUserAdmin || isOwn; 

    menuReplyBtn.style.display = 'flex';
    menuEditBtn.style.display = canEdit ? 'flex' : 'none';
    menuDeleteBtn.style.display = canDelete ? 'flex' : 'none';

    let x, y;
    if (e.type === 'contextmenu') {
        x = e.pageX;
        y = e.pageY;
    } else { 
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
    }

    messageContextMenu.style.display = 'block';
    contextMenuOverlay.style.display = 'block';

    const menuWidth = messageContextMenu.offsetWidth;
    const menuHeight = messageContextMenu.offsetHeight;
    if (x + menuWidth > window.innerWidth - 10) {
        x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight - 10) {
        y = window.innerHeight - menuHeight - 10;
    }
    
    messageContextMenu.style.left = `${x}px`;
    messageContextMenu.style.top = `${y}px`;
}

function hideContextMenu() {
    messageContextMenu.style.display = 'none';
    contextMenuOverlay.style.display = 'none';
    activeMessageData = null;
}

// --- NEW: Handle Reaction ---
async function handleReaction(messageId, emoji) {
    if (!currentUser || !currentGroupId) return;

    const messageRef = doc(db, "groups", currentGroupId, "messages", messageId);
    const userId = currentUser.uid;

    try {
        const messageSnap = await getDoc(messageRef);
        if (!messageSnap.exists()) return;

        const messageData = messageSnap.data();
        const reactions = messageData.reactions || {};
        
        let userHasReacted = false;
        let existingReaction = null;

        // Check if user has reacted at all
        for (const [key, users] of Object.entries(reactions)) {
            if (users.includes(userId)) {
                userHasReacted = true;
                existingReaction = key;
                break;
            }
        }

        const update = {};

        if (userHasReacted) {
            // User is changing or removing reaction
            // First, always remove the old reaction
            update[`reactions.${existingReaction}`] = arrayRemove(userId);

            if (existingReaction !== emoji) {
                // If it's a *new* emoji, add it
                update[`reactions.${emoji}`] = arrayUnion(userId);
            }
            // If it's the *same* emoji, we just remove it (toggle off)
        } else {
            // User has not reacted, so add the new reaction
            update[`reactions.${emoji}`] = arrayUnion(userId);
        }

        await updateDoc(messageRef, update);

    } catch (error) {
        console.error("Error handling reaction:", error);
        showToast("Failed to add reaction.");
    }
}

// --- Cloudinary Upload Function ---
async function uploadImageToCloudinary(file) {
    try {
        const response = await fetch('/.netlify/functions/generate-group-signature');
        if (!response.ok) throw new Error('Could not get upload signature.');
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

// --- File Preview Logic ---
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
        document.getElementById('remove-edit-group-image-btn').addEventListener('click', (ev) => {
            ev.stopPropagation();
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
            dangerZoneSection.style.display = 'none'; 
        } else if (isUserAdmin) {
            modalEditBtn.style.display = 'block';
            dangerZoneSection.style.display = 'block';
        }
        else {
            modalEditBtn.style.display = 'none';
            dangerZoneSection.style.display = 'block';
        }
        groupDetailsModal.classList.add('active');
        fetchGroupMembers(currentGroupData.members || []);
    });

    modalCloseBtn.addEventListener('click', () => {
        groupDetailsModal.classList.remove('active');
    });

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
                admins: arrayRemove(currentUser.uid)
            });
            await deleteDoc(memberDocRef).catch(err => {});
            await updateDoc(userDocRef, {
                followedGroups: arrayRemove(currentGroupId)
            });
            showToast("You have left the group.");
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error leaving group:", error);
            showToast("Failed to leave group. Please try again.");
        }
    });

    modalEditBtn.addEventListener('click', () => {
        editGroupNameInput.value = currentGroupData.name;
        editGroupDescInput.value = currentGroupData.description;
        editGroupCategorySelect.value = currentGroupData.category || "";
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
            admins: arrayRemove(userIdToRemove)
        });
        await deleteDoc(memberDocRef).catch(err => {});
        await updateDoc(userDocRef, {
            followedGroups: arrayRemove(currentGroupId)
        });
        showToast(`${userName} has been removed.`);
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
                const memberName = userData.fullName || 'User'; 
                const isGroupAdmin = currentGroupData.admins.includes(memberId) || isCreator;
                const avatar = userData.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(memberName).charAt(0)}`;
                const role = isGroupAdmin ? `<span class="member-role">Admin</span>` : '';
                let actionBtnsHTML = '';
                if (isSuperAdmin && memberId !== currentUser.uid) {
                    if (isGroupAdmin) {
                        if (!isCreator) {
                            actionBtnsHTML += `<button class="admin-action-btn demote-btn" data-user-id="${memberId}">Demote</button>`;
                        }
                    } else {
                        actionBtnsHTML += `<button class="admin-action-btn" data-user-id="${memberId}">Promote</button>`;
                    }
                    actionBtnsHTML += `<button class="remove-member-btn" data-user-id="${memberId}" data-user-name="${memberName}">Remove</button>`;
                } else if (isUserAdmin && !isSuperAdmin && !isGroupAdmin && memberId !== currentUser.uid) {
                    actionBtnsHTML += `<button class="remove-member-btn" data-user-id="${memberId}" data-user-name="${memberName}">Remove</button>`;
                }
                memberDiv.innerHTML = `
                    <a href="../profile.html?sellerId=${memberId}" class="message-profile-link" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 15px; width: 100%;">
                        <img src="${avatar}" alt="${memberName}" class="member-avatar">
                        <span class="member-name">${memberName}</span>
                        ${role}
                    </a>
                    <div style="display: flex; gap: 5px;">
                        ${actionBtnsHTML}
                    </div>
                `;
                modalMembersList.appendChild(memberDiv);
            }
        });
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