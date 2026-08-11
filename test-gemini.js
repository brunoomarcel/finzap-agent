const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  const testModels = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-pro'
  ];

  for (const m of testModels) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('Hi');
      console.log(`✅ Model SUCCESS: ${m}`);
      return m;
    } catch (err) {
      console.log(`❌ Model ${m} failed: ${err.message.substring(0, 100)}`);
    }
  }
}

checkModels();
