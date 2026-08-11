require('dotenv').config();

module.exports = {
  baseUrl: process.env.EVOLUTION_API_URL || 'https://evogo.medainer.com.br',
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'finzap'
};
