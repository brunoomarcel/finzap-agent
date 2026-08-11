const axios = require('axios');
const evolutionConfig = require('../config/evolution');

/**
 * Standardized WhatsApp Service for Evolution API Go
 */
class WhatsappService {
  /**
   * Cleans and normalizes phone number to digits only (e.g. 557996018591)
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  /**
   * Standardized method to send text messages via Evolution API Go.
   * Endpoint: POST /send/text
   * Body: { "number": "557996018591", "text": "Mensagem..." }
   * Header: apikey: <EVOLUTION_API_KEY or instanceToken>
   * 
   * @param {string} to - Recipient phone number
   * @param {string} message - Text message content
   * @param {string} instanceToken - Optional instance token from incoming webhook
   * @returns {Promise<boolean>} Success status
   */
  async sendMessage(to, message, instanceToken = null) {
    const { baseUrl, apiKey } = evolutionConfig;
    const activeKey = instanceToken || apiKey;

    if (!activeKey) {
      console.warn('⚠️ EVOLUTION_API_KEY is not defined in .env');
      return false;
    }

    const recipient = this.formatPhoneNumber(to);
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const endpointUrl = `${cleanBaseUrl}/send/text`;

    try {
      console.log(`📱 [WhatsApp Outbound] Sending to ${recipient}...`);

      const response = await axios.post(
        endpointUrl,
        {
          number: recipient,
          text: message
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': activeKey
          },
          timeout: 10000
        }
      );

      if (response.status === 200 || response.data?.message === 'success') {
        console.log(`✅ [WhatsApp Outbound] Message successfully delivered to ${recipient}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ [WhatsApp Outbound Error] Failed to send to ${recipient}:`, error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Standardized parser for incoming webhooks from Evolution API Go.
   * Extracts sender phone, text message, push name and instance token.
   */
  parseWebhookPayload(body) {
    if (!body) return null;

    let senderPhone = null;
    let messageText = null;
    let pushName = 'Usuário';

    // Evolution API Go structure
    if (body.data) {
      const info = body.data.Info || {};
      const senderJid = info.Sender || info.Chat || '';
      senderPhone = senderJid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '');
      pushName = info.PushName || 'Usuário';

      const msg = body.data.Message || {};
      messageText =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        null;
    }

    // Fallback standard structure
    if (!senderPhone) {
      const key = body.key || body.data?.key;
      if (key) {
        if (key.fromMe) return null;
        senderPhone = (key.remoteJid || '').replace('@s.whatsapp.net', '');
      }
      if (!senderPhone && body.sender) {
        senderPhone = body.sender.replace('@s.whatsapp.net', '');
      }

      pushName = body.pushName || body.data?.pushName || pushName;

      const msg = body.message || body.data?.message;
      if (msg) {
        messageText =
          msg.conversation ||
          msg.extendedTextMessage?.text ||
          msg.imageMessage?.caption ||
          msg.videoMessage?.caption ||
          null;
      }
    }

    if (!senderPhone || !messageText) {
      return null;
    }

    return {
      senderPhone,
      messageText,
      pushName,
      instanceName: body.instanceName || evolutionConfig.instanceName,
      instanceToken: body.instanceToken || null
    };
  }
}

module.exports = new WhatsappService();
