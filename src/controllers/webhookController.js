const supabaseService = require('../services/supabaseService');
const whatsappService = require('../services/whatsappService');
const geminiAgentService = require('../services/geminiAgentService');
const groqAgentService = require('../services/groqAgentService');
const openrouterAgentService = require('../services/openrouterAgentService');

class WebhookController {
  /**
   * Handles incoming webhooks from Evolution API Go.
   * Dynamically routes AI requests to OpenRouter, Groq, or Gemini with intelligent fallback.
   */
  async handleEvolutionWebhook(req, res) {
    // Always return HTTP 200 immediately to prevent Evolution API timeout / retries
    res.status(200).json({ status: 'received' });

    try {
      // 1. Parse webhook payload and filter out fromMe messages (messages sent by the instance itself)
      const parsed = whatsappService.parseWebhookPayload(req.body);
      if (!parsed) {
        return;
      }

      const { senderPhone, messageText, pushName, instanceToken } = parsed;

      // 2. SECURITY CHECK: Verify if sender phone exists in Supabase 'usuarios' table BEFORE calling AI
      const usuario = await supabaseService.findUserByPhone(senderPhone);

      if (!usuario) {
        console.warn(`🛑 [SECURITY] Ignored message from unregistered number: ${senderPhone} (${pushName}). Message was NOT sent to AI.`);
        return;
      }

      if (!usuario.ativo) {
        console.warn(`🛑 [SECURITY] Ignored message from inactive user: ${usuario.nome} (${senderPhone}). Message was NOT sent to AI.`);
        return;
      }

      console.log(`✅ [AUTHORIZED USER] Processing request for registered user: ${usuario.nome} (Phone: ${senderPhone}, ID: ${usuario.id})`);

      let agentReply = '';
      const provider = process.env.AI_PROVIDER || (process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.GROQ_API_KEY ? 'groq' : 'gemini'));

      // 3. AI Engine Routing with Multi-Layer Fallback
      if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
        console.log('🌐 Routing request to OpenRouter Free AI Engine...');
        try {
          agentReply = await openrouterAgentService.processUserMessage(messageText, usuario);
        } catch (openrouterErr) {
          console.warn('⚠️ OpenRouter failed, trying Groq/Gemini fallback:', openrouterErr.message);
          if (process.env.GROQ_API_KEY) {
            agentReply = await groqAgentService.processUserMessage(messageText, usuario);
          } else {
            agentReply = await geminiAgentService.processUserMessage(messageText, usuario);
          }
        }
      } else if (provider === 'groq' && process.env.GROQ_API_KEY) {
        console.log('🤖 Routing request to GROQ Cloud AI Engine...');
        try {
          agentReply = await groqAgentService.processUserMessage(messageText, usuario);
        } catch (groqErr) {
          console.warn('⚠️ GROQ failed, falling back to Gemini AI:', groqErr.message);
          agentReply = await geminiAgentService.processUserMessage(messageText, usuario);
        }
      } else {
        console.log('🤖 Routing request to Gemini AI Engine...');
        agentReply = await geminiAgentService.processUserMessage(messageText, usuario);
      }

      // 4. Send response back to user via WhatsApp (Evolution API Go)
      await whatsappService.sendMessage(senderPhone, agentReply, instanceToken);

    } catch (error) {
      console.error('❌ Error handling webhook:', error);
    }
  }
}

module.exports = new WebhookController();
