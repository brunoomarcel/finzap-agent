const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️ Warning: GEMINI_API_KEY is not defined in .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

module.exports = {
  genAI,
  modelName: process.env.GEMINI_MODEL || 'gemini-3.5-flash'
};
