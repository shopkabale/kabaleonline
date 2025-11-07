// ================================================================== //
//                                                                    //
//    THIS IS THE FINAL, CORRECTED `handleFormSubmit` FUNCTION        //
//                                                                    //
// ================================================================== //

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const saveButton = document.getElementById('saveButton');
    const storeForm = document.getElementById('storeForm');
    
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    showMessage('info', 'Validating store data...');

    const username = storeForm.storeUsername.value.trim().toLowerCase();
    
    // --- Validate Username Format ---
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

    // +++++ USERNAME CHECK LOGIC +++++
    let usernameChanged = (username !== existingUsername);
    
    if (usernameChanged) {
        // Check for availability in the new public collection
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
    // +++++ END USERNAME CHECK LOGIC +++++

    try {
        let profileImageUrl = storeForm.dataset.existingProfileUrl;
        let bannerUrl = storeForm.dataset.existingBannerUrl;
        
        const profileImageFile = storeForm.storeProfileImageFile.files[0];
        const bannerImageFile = storeForm.storeBannerFile.files[0];

        // --- Upload Profile Pic (if new one is selected) ---
        if (profileImageFile) {
            showMessage('info', 'Uploading profile picture...');
            saveButton.textContent = 'Uploading Profile...';
            profileImageUrl = await uploadImageToCloudinary(profileImageFile);
            showMessage('info', 'Profile picture uploaded!');
        }

        // --- Upload Banner (if new one is selected) ---
        if (bannerImageFile) {
            showMessage('info', 'Uploading store banner...');
            saveButton.textContent = 'Uploading Banner...';
            bannerUrl = await uploadImageToCloudinary(bannerImageFile);
            showMessage('info', 'Store banner uploaded!');
        }

        // --- Prepare Data into a structured object ---
        showMessage('info', 'Saving settings to database...');
        saveButton.textContent = 'Saving...';
        
        const storeData = {
            username: username,
            storeName: storeForm.storeName.value.trim(),
            description: storeForm.storeDescription.value.trim(),
            profileImageUrl: profileImageUrl,
            links: {
                whatsapp: storeForm.linkWhatsapp.value.trim(),
                facebook: storeForm.linkFacebook.value.trim(),
                tiktok: storeForm.linkTiktok.value.trim(),
                github: storeForm.linkGithub.value.trim()
            },
            design: {
                bannerUrl: bannerUrl,
                themeColor: storeForm.storeThemeColor.value,
                productLayout: storeForm.productLayout.value
            },
            footer: {
                text: storeForm.footerText.value.trim(),
                color: storeForm.footerColor.value
            },
            updatedAt: new Date()
        };

        // --- Save to Firestore ---
        // 1. Save the main data to the user's private document
        await setDoc(userDocRef, {
            store: storeData,
            isSeller: true
        }, { merge: true });

        // +++++ NEW: UPDATE PUBLIC USERNAME COLLECTION (FIXED) +++++
        
        // 1. Always create or update the *current* username document.
        // This is "idempotent" - it's safe to run even if the doc already exists.
        // This will fix the migration issue for existing users.
        const newUsernameRef = doc(db, 'storeUsernames', username);
        await setDoc(newUsernameRef, { userId: currentUser.uid });

        // 2. If the username *changed* and there was an old one, delete the old one.
        if (usernameChanged && existingUsername) {
            const oldUsernameRef = doc(db, 'storeUsernames', existingUsername);
            await deleteDoc(oldUsernameRef).catch(err => {
                console.warn("Could not delete old username doc:", err);
            });
        }
        // +++++ END OF NEW LOGIC +++++

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