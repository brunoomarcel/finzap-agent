const { genAI, modelName } = require('../config/gemini');
const { toolDeclarations, executeTool } = require('../tools/agentTools');

class GeminiAgentService {
  /**
   * Processes a message from a WhatsApp user using Gemini AI Agent.
   * @param {string} userMessage - Text message received from user
   * @param {object} usuario - User record from Supabase 'usuarios' table
   * @returns {Promise<string>} Text reply to send back on WhatsApp
   */
  async processUserMessage(userMessage, usuario) {
    if (!process.env.GEMINI_API_KEY) {
      return '⚠️ O agente de inteligência artificial não está configurado (chave GEMINI_API_KEY ausente).';
    }

    const candidateModels = [
      modelName,
      'gemini-2.5-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let lastError = null;

    for (const modelId of uniqueModels) {
      try {
        console.log(`🤖 Attempting initialization with Gemini model: ${modelId}`);

        const model = genAI.getGenerativeModel({
          model: modelId,
          systemInstruction: `Você é o assistente de finanças pessoais do WhatsApp para o usuário "${usuario.nome}".
Sua tarefa é ajudar o usuário a gerenciar suas finanças com facilidade, agilidade e educação.

Diretrizes de Atendimento:
1. Responda em português do Brasil, usando tom amigável, claro e conciso (ideal para WhatsApp, use emojis quando apropriado).
2. O usuário pode enviar áudio transcrito ou texto livre (ex: "Gastei 50 no Uber", "Recebi 3000 de salário", "Quanto gastei este mês?", "Definir limite de 1000 para mercado").
3. Use as ferramentas disponíveis para consultar, criar, atualizar ou deletar transações, limites e categorias diretamente no banco de dados.
4. Quando registrar um gasto ou receita, informe o valor, a categoria e o método de pagamento assumidos ou informados.
5. Se a transação ultrapassar ou chegar perto do limite da categoria, avise o usuário!
6. A data atual é: ${new Date().toLocaleDateString('pt-BR')} (considerar este ano e mês para termos relativos como 'hoje', 'ontem', 'este mês').
`
        });

        const toolsConfig = [
          {
            functionDeclarations: toolDeclarations
          }
        ];

        const chat = model.startChat({
          tools: toolsConfig
        });

        let result = await chat.sendMessage(userMessage);
        let response = await result.response;

        // Handle function calls loop (Max 5 iterations to avoid loops)
        let iterations = 0;
        while (iterations < 5) {
          const functionCalls = response.functionCalls();
          if (!functionCalls || functionCalls.length === 0) {
            break;
          }

          iterations++;
          const functionResponses = [];

          for (const call of functionCalls) {
            console.log(`🤖 Agent calling tool: [${call.name}] with args:`, call.args);

            try {
              const toolResult = await executeTool(call.name, call.args, { usuario });
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: toolResult
                }
              });
            } catch (err) {
              console.error(`❌ Error executing tool ${call.name}:`, err);
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { status: 'erro', mensagem: err.message }
                }
              });
            }
          }

          // Send function execution results back to Gemini
          result = await chat.sendMessage(functionResponses);
          response = await result.response;
        }

        return response.text();

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Model ${modelId} failed (${error.message}). Trying next fallback model...`);
      }
    }

    console.error('❌ All Gemini models failed:', lastError);
    return 'Desculpe, ocorreu um erro ao processar sua solicitação financeira. Por favor, tente novamente em instantes.';
  }
}

module.exports = new GeminiAgentService();
