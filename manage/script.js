// -------------------------------------------------------------------
//  1. PASTE YOUR AIRTABLE CREDENTIALS HERE
// -------------------------------------------------------------------
const AIRTABLE_PAT = 'pat_YOUR_PERSONAL_ACCESS_TOKEN';
const AIRTABLE_BASE_ID = 'app_YOUR_BASE_ID';
const AIRTABLE_TABLE_NAME = 'Products';

// -------------------------------------------------------------------
//  2. DO NOT EDIT BELOW THIS LINE
// -------------------------------------------------------------------
const container = document.getElementById('management-container');

async function verifyAndManage() {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get('id');
    const managementKey = params.get('key');

    if (!recordId || !managementKey) {
        container.innerHTML = '<h2>Error</h2><p>Invalid management link. Please check the URL and try again.</p>';
        return;
    }

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` } });
        if (!response.ok) throw new Error('Record not found.');

        const record = await response.json();
        
        // SECURITY CHECK: Compare the key from the URL with the key stored in Airtable
        if (record.fields.ManagementKey !== managementKey) {
            throw new Error('Authorization failed.');
        }

        // If keys match, show the management options
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

        document.getElementById('sold-btn').addEventListener('click', () => updateStatus(recordId, 'Sold'));
        document.getElementById('delete-btn').addEventListener('click', () => deleteItem(recordId));

    } catch (error) {
        container.innerHTML = `<h2>Error</h2><p>Could not verify your item. The link may be incorrect or the item may have already been deleted.</p>`;
        console.error(error);
    }
}

async function updateStatus(recordId, newStatus) {
    const actionStatus = document.getElementById('action-status');
    actionStatus.textContent = 'Updating...';
    
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
    const data = { fields: { 'Status': newStatus } };

    const response = await fetch(url, {
        method: 'PATCH', // PATCH is used for updating records
        headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        container.innerHTML = '<h2>Success!</h2><p>Your item has been marked as sold and will be removed from the main shop page.</p>';
    } else {
        actionStatus.textContent = 'Failed to update status.';
    }
}

async function deleteItem(recordId) {
    if (!confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) {
        return;
    }
    
    const actionStatus = document.getElementById('action-status');
    actionStatus.textContent = 'Deleting...';

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` }
    });

    if (response.ok) {
        container.innerHTML = '<h2>Success!</h2><p>Your item has been permanently deleted.</p>';
    } else {
        actionStatus.textContent = 'Failed to delete item.';
    }
}

// Run the main function when the page loads
verifyAndManage();
