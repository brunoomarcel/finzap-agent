const axios = require('axios');
require('dotenv').config();

async function checkApiKey() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Testing Key:', key ? `${key.substring(0, 8)}...` : 'NONE');

  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    console.log('Available Models in Google AI Studio:');
    if (res.data.models) {
      res.data.models.forEach(m => console.log(' -', m.name));
    } else {
      console.log(res.data);
    }
  } catch (err) {
    console.error('HTTP Error Status:', err.response?.status);
    console.error('HTTP Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

checkApiKey();
