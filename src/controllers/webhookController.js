const supabaseService = require('../services/supabaseService');
const whatsappService = require('../services/whatsappService');
const geminiAgentService = require('../services/geminiAgentService');

class WebhookController {
  /**
   * Handles incoming webhooks from Evolution API Go.
   */
  async handleEvolutionWebhook(req, res) {
    // Always return HTTP 200 immediately to prevent Evolution API timeout / retries
    res.status(200).json({ status: 'received' });

    try {
      const parsed = whatsappService.parseWebhookPayload(req.body);
      if (!parsed) {
        return;
      }

      const { senderPhone, messageText, pushName } = parsed;
      console.log(`📩 Webhook received message from ${senderPhone} (${pushName}): "${messageText}"`);

      // SECURITY CHECK: Verify if sender phone exists in Supabase 'usuarios' table
      const usuario = await supabaseService.findUserByPhone(senderPhone);

      if (!usuario) {
        console.warn(`🛑 [SECURITY] Ignored message from unregistered number: ${senderPhone}`);
        // Optionally send unauthorized notification or ignore quietly
        return;
      }

      if (!usuario.ativo) {
        console.warn(`🛑 [SECURITY] Ignored message from inactive user: ${usuario.nome} (${senderPhone})`);
        return;
      }

      console.log(`✅ [AUTHORIZED] Processing request for registered user: ${usuario.nome} (ID: ${usuario.id})`);

      // Process message through Gemini AI Agent with Supabase Tools
      const agentReply = await geminiAgentService.processUserMessage(messageText, usuario);

      // Send response back to user via WhatsApp (Evolution API Go)
      await whatsappService.sendMessage(senderPhone, agentReply);

    } catch (error) {
      console.error('❌ Error handling webhook:', error);
    }
  }
}

module.exports = new WebhookController();
