const { genAI } = require('../config/gemini');
const { toolDeclarations, executeTool } = require('../tools/agentTools');

class GeminiAgentService {
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Processes a message from a WhatsApp user using Gemini AI Agent.
   * Handles rate limits (429) gracefully and prevents duplicate database mutations.
   * @param {string} userMessage - Text message received from user
   * @param {object} usuario - User record from Supabase 'usuarios' table
   * @returns {Promise<string>} Text reply to send back on WhatsApp
   */
  async processUserMessage(userMessage, usuario) {
    if (!process.env.GEMINI_API_KEY) {
      return '⚠️ O agente de inteligência artificial não está configurado (chave GEMINI_API_KEY ausente).';
    }

    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.0-flash'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let mutationExecuted = false;
    let readResult = null;
    let lastError = null;

    for (const modelId of uniqueModels) {
      try {
        console.log(`🤖 Processing message with Gemini model: ${modelId}`);

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

        const toolsConfig = [{ functionDeclarations: toolDeclarations }];
        const chat = model.startChat({ tools: toolsConfig });

        let result = await chat.sendMessage(userMessage);
        let response = await result.response;

        // Handle function calls loop (Max 5 iterations)
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

            // Track mutation vs read tools
            if (['registrar_transacao', 'deletar_transacao', 'deletar_multiplas_transacoes', 'limpar_todas_transacoes', 'atualizar_transacao', 'criar_categoria', 'deletar_categoria', 'definir_limite_gasto'].includes(call.name)) {
              if (mutationExecuted) {
                console.log(`⚠️ Skipping duplicate mutation tool [${call.name}] in same message processing.`);
                continue;
              }
            }

            try {
              const toolResult = await executeTool(call.name, call.args, { usuario });

              if (['registrar_transacao', 'deletar_transacao', 'deletar_multiplas_transacoes', 'limpar_todas_transacoes', 'atualizar_transacao', 'criar_categoria', 'deletar_categoria', 'definir_limite_gasto'].includes(call.name)) {
                mutationExecuted = true;
              } else {
                readResult = toolResult;
              }

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

          if (functionResponses.length === 0) {
            break;
          }

          // Send function execution results back to Gemini
          result = await chat.sendMessage(functionResponses);
          response = await result.response;
        }

        return response.text();

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Model ${modelId} encountered error (${error.message}).`);

        if (error.status === 429 || (error.message && error.message.includes('429'))) {
          console.warn(`⏳ Rate limit (429) on ${modelId}. Trying next fallback model...`);
          await this.sleep(1000);
          continue;
        } else {
          continue;
        }
      }
    }

    // Fallback response if all AI models hit rate limit
    if (mutationExecuted) {
      return '✅ Operação realizada com sucesso no seu banco de dados!';
    } else if (readResult && readResult.resumo) {
      const r = readResult.resumo;
      return `📊 *Resumo Financeiro (${r.mes_ano}):*\n\n💰 *Receitas:* R$ ${r.total_receitas.toFixed(2)}\n💸 *Despesas:* R$ ${r.total_despesas.toFixed(2)}\n🟢 *Saldo Líquido:* R$ ${r.saldo_liquido.toFixed(2)}`;
    }

    console.error('❌ All Gemini models failed:', lastError);
    return 'Desculpe, limite de requisições da IA atingido temporariamente. Por favor, tente novamente em alguns segundos.';
  }
}

module.exports = new GeminiAgentService();
