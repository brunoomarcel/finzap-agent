const axios = require('axios');
const evolutionConfig = require('../config/evolution');

class WhatsappService {
  /**
   * Formats a phone number for Evolution API (e.g. 5511999999999).
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    return digits;
  }

  /**
   * Sends a text message to a WhatsApp number via Evolution API Go.
   * @param {string} to - Destination phone number
   * @param {string} message - Message text
   */
  async sendMessage(to, message) {
    const { baseUrl, apiKey, instanceName } = evolutionConfig;

    if (!apiKey) {
      console.warn('⚠️ EVOLUTION_API_KEY is not defined. Skipping WhatsApp response dispatch.');
      console.log(`📱 [SIMULATION ONLY] Would send to ${to}:\n${message}`);
      return false;
    }

    const recipient = this.formatPhoneNumber(to);
    const url = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`;

    try {
      console.log(`🚀 Sending WhatsApp message to ${recipient} via Evolution API...`);
      
      const response = await axios.post(
        url,
        {
          number: recipient,
          text: message,
          options: {
            delay: 1000,
            presence: 'composing'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          timeout: 15000
        }
      );

      console.log('✅ WhatsApp message sent successfully:', response.data?.key || response.data);
      return true;
    } catch (error) {
      console.error('❌ Failed to send WhatsApp message via Evolution API:', error.response?.data || error.message);
      
      // Fallback try for alternative v1 Evolution API payload structure
      try {
        const fallbackUrl = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`;
        await axios.post(
          fallbackUrl,
          {
            number: recipient,
            textMessage: { text: message }
          },
          {
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            timeout: 10000
          }
        );
        return true;
      } catch (errFallback) {
        console.error('❌ Fallback attempt also failed:', errFallback.message);
        return false;
      }
    }
  }

  /**
   * Extracts user phone and text message content from incoming Evolution API webhook payload.
   * Handles various Evolution API versions (MESSAGES_UPSERT, SEND_MESSAGE, etc.).
   */
  parseWebhookPayload(body) {
    if (!body) return null;

    // Check Evolution API payload patterns
    let senderPhone = null;
    let messageText = null;
    let pushName = null;

    // Standard Evolution API structure
    const data = body.data || body;
    
    // Check sender jid or phone
    const key = data.key || body.key;
    if (key) {
      if (key.fromMe) {
        // Ignore messages sent by the bot itself
        return null;
      }
      const remoteJid = key.remoteJid || '';
      senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    }

    if (!senderPhone && data.sender) {
      senderPhone = data.sender.replace('@s.whatsapp.net', '');
    }

    pushName = data.pushName || body.pushName || 'Usuário';

    // Extract text content from various message types
    const msg = data.message || body.message;
    if (msg) {
      messageText =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        null;
    }

    // Audio transcription or audio message handling fallback
    if (!messageText && msg?.audioMessage) {
      messageText = body.transcription || body.transcriptionText || '[Áudio recebido]';
    }

    if (!senderPhone || !messageText) {
      return null;
    }

    return {
      senderPhone,
      messageText,
      pushName
    };
  }
}

module.exports = new WhatsappService();
