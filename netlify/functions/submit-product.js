const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const fields = JSON.parse(event.body);
    
    // Generate management key and set default status on the backend
    const managementKey = Math.random().toString(36).substring(2, 15);
    fields.Status = 'Pending Approval';
    fields.ManagementKey = managementKey;

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) throw new Error('Failed to create record in Airtable');

    const newRecord = await response.json();

    // Send back the new record's ID and the management key
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: newRecord.id,
        managementKey: managementKey,
      }),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
