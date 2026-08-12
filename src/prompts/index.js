const securityPrompt = require('./securityPrompt');
const getGreetingPrompt = require('./greetingPrompt');
const financialRulesPrompt = require('./financialRulesPrompt');

/**
 * Builds the complete dynamic system prompt combining Security, Greetings, and Financial Rules.
 * 
 * @param {Object} params
 * @param {Object} params.usuario - User object containing nome, id, etc.
 * @param {boolean} params.hasHistory - Indicates if past conversation history exists
 * @returns {string} System prompt
 */
function buildSystemPrompt({ usuario, hasHistory }) {
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return `Você é o assistente virtual de finanças pessoais no WhatsApp do usuário "${usuario.nome}".
Sua função é gerenciar as finanças do usuário com máxima precisão, praticidade e cordialidade.
Data atual do sistema: ${currentDate}.

${securityPrompt}

${getGreetingPrompt(hasHistory, usuario.nome)}

${financialRulesPrompt}`;
}

module.exports = {
  buildSystemPrompt,
  securityPrompt,
  getGreetingPrompt,
  financialRulesPrompt
};
