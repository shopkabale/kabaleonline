// NOTE: Airtable credentials are now removed from this file.

const container = document.getElementById('management-container');
const params = new URLSearchParams(window.location.search);
const recordId = params.get('id');
const managementKey = params.get('key');

async function verifyAndShowManager() {
    if (!recordId || !managementKey) {
        container.innerHTML = '<h2>Error</h2><p>Invalid management link. Please check the URL and try again.</p>';
        return;
    }

    try {
        const url = `/.netlify/functions/manage-product?id=${recordId}&key=${managementKey}`;
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) throw new Error('Could not verify item.');
        
        const record = await response.json();
        
        container.innerHTML = `
            <h2>Manage Your Item</h2>
            <h3>${record.fields.Name}</h3>
            <p>Current Status: <strong>${record.fields.Status}</strong></p>
            <hr>
            <p>What would you like to do?</p>
            <button id="sold-btn" class="btn-cta">Mark as Sold</button>
            <button id="delete-btn" style="background-color: #dc3545; margin-top: 10px;">Permanently Delete Item</button>
            <div id="action-status" style="margin-top: 15px;"></div>
        `;

        document.getElementById('sold-btn').addEventListener('click', () => updateStatus('Sold'));
        document.getElementById('delete-btn').addEventListener('click', () => deleteItem());

    } catch (error) {
        container.innerHTML = `<h2>Error</h2><p>Could not verify your item. The link may be incorrect or the item may have already been deleted.</p>`;
        console.error(error);
    }
}

async function updateStatus(newStatus) {
    const actionStatus = document.getElementById('action-status');
    actionStatus.textContent = 'Updating...';
    
    const url = `/.netlify/functions/manage-product?id=${recordId}&key=${managementKey}`;
    const response = await fetch(url, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
        container.innerHTML = '<h2>Success!</h2><p>Your item has been marked as sold and will be removed from the main shop page.</p>';
    } else {
        actionStatus.textContent = 'Failed to update status.';
    }
}

async function deleteItem() {
    if (!confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) {
        return;
    }
    
    const actionStatus = document.getElementById('action-status');
    actionStatus.textContent = 'Deleting...';

    const url = `/.netlify/functions/manage-product?id=${recordId}&key=${managementKey}`;
    const response = await fetch(url, { method: 'DELETE' });

    if (response.ok) {
        container.innerHTML = '<h2>Success!</h2><p>Your item has been permanently deleted.</p>';
    } else {
        actionStatus.textContent = 'Failed to delete item.';
    }
}

// Run the main function when the page loads
verifyAndShowManager();
