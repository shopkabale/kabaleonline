const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

exports.handler = async (event) => {
  const { id, key } = event.queryStringParameters;

  if (!id || !key) {
    return { statusCode: 400, body: 'Missing ID or key' };
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${id}`;

  try {
    // First, fetch the record to verify the management key for all methods
    const verifyResponse = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` },
    });
    if (!verifyResponse.ok) throw new Error('Record not found.');

    const record = await verifyResponse.json();
    if (record.fields.ManagementKey !== key) {
      throw new Error('Authorization failed. Invalid key.');
    }

    // --- Handle different request types (GET, PATCH, DELETE) ---

    // If it's a GET request, just return the record details
    if (event.httpMethod === 'GET') {
      return { statusCode: 200, body: JSON.stringify(record) };
    }

    // If it's a PATCH request, update the status
    if (event.httpMethod === 'PATCH') {
      const { status } = JSON.parse(event.body);
      const updateResponse = await fetch(url, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { 'Status': status } }),
      });
      if (!updateResponse.ok) throw new Error('Failed to update record.');
      const updatedRecord = await updateResponse.json();
      return { statusCode: 200, body: JSON.stringify(updatedRecord) };
    }
    
    // If it's a DELETE request, delete the record
    if (event.httpMethod === 'DELETE') {
      const deleteResponse = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` },
      });
      if (!deleteResponse.ok) throw new Error('Failed to delete record.');
      const deletedInfo = await deleteResponse.json();
      return { statusCode: 200, body: JSON.stringify(deletedInfo) };
    }

    // If method is not supported
    return { statusCode: 405, body: 'Method Not Allowed' };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
