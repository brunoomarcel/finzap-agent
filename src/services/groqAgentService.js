const Groq = require('groq-sdk');
const { executeTool } = require('../tools/agentTools');
const memoryService = require('./memoryService');

/**
 * Open-AI / Groq Standard Tool Definitions for Function Calling
 */
const groqTools = [
  {
    type: 'function',
    function: {
      name: 'registrar_transacao',
      description: 'Registra uma nova transação financeira (despesa, receita, empréstimo), incluindo parcelamentos.',
      parameters: {
        type: 'object',
        properties: {
          descricao: { type: 'string', description: 'Descrição da transação (ex: Mercado, Salário, Aluguel).' },
          valor: { type: 'number', description: 'Valor numérico em Reais (ex: 45.90 ou 4500). OBRIGATÓRIO e maior que zero.' },
          tipo_transacao: {
            type: 'string',
            enum: ['despesa', 'receita', 'emprestimo_tomado', 'emprestimo_concedido'],
            description: 'Tipo de transação. ATENÇÃO: Salário, rendimento, pagamento recebido, vendas, PIX recebido DEVEM SER tipo "receita". Compras, contas, almoço, mercado DEVEM SER "despesa".'
          },
          metodo_pagamento: {
            type: 'string',
            enum: ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'outros'],
            description: 'Forma de pagamento utilizada.'
          },
          categoria_nome: { type: 'string', description: 'Nome da categoria (ex: Alimentação, Transporte, Moradia, Lazer, Salário).' },
          eh_parcelado: { type: 'boolean', description: 'Se true, indica que a compra é parcelada.' },
          total_parcelas: { type: 'integer', description: 'Quantidade total de parcelas (ex: 3, 10, 12).' },
          data_transacao: { type: 'string', description: 'Data da transação no formato ISO ou YYYY-MM-DD.' }
        },
        required: ['descricao', 'valor', 'tipo_transacao']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listar_transacoes',
      description: 'Lista e consulta as transações financeiras registradas.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Quantidade máxima de registros (padrão: 10).' },
          tipo_transacao: { type: 'string', enum: ['despesa', 'receita', 'emprestimo_tomado', 'emprestimo_concedido'] },
          data_inicio: { type: 'string', description: 'Data inicial para filtro (YYYY-MM-DD).' },
          data_fim: { type: 'string', description: 'Data final para filtro (YYYY-MM-DD).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obter_resumo_financeiro',
      description: 'Obtém o resumo financeiro do mês (total de receitas, despesas, saldo líquido e limites).',
      parameters: {
        type: 'object',
        properties: {
          mes_ano: { type: 'string', description: 'Ano e mês no formato YYYY-MM (ex: 2026-08).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'definir_limite_gasto',
      description: 'Define ou atualiza um teto/limite de gastos mensal para uma categoria.',
      parameters: {
        type: 'object',
        properties: {
          categoria_nome: { type: 'string', description: 'Nome da categoria (ex: Alimentação, Lazer).' },
          valor_limite: { type: 'number', description: 'Valor limite em Reais (ex: 500.00).' },
          mes_ano: { type: 'string', description: 'Mês e ano no formato YYYY-MM (ex: 2026-08).' }
        },
        required: ['categoria_nome', 'valor_limite']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listar_limites_gastos',
      description: 'Lista os limites de gastos configurados e o status do orçamento.',
      parameters: {
        type: 'object',
        properties: {
          mes_ano: { type: 'string', description: 'Mês e ano no formato YYYY-MM.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deletar_transacao',
      description: 'Exclui uma transação pelo seu ID.',
      parameters: {
        type: 'object',
        properties: {
          transacao_id: { type: 'string', description: 'UUID da transação a ser deletada.' }
        },
        required: ['transacao_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deletar_multiplas_transacoes',
      description: 'Exclui múltiplas transações fornecendo uma lista de IDs.',
      parameters: {
        type: 'object',
        properties: {
          transacao_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de UUIDs para excluir.'
          }
        },
        required: ['transacao_ids']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'limpar_todas_transacoes',
      description: 'Exclui TODAS as transações cadastradas do usuário.',
      parameters: {
        type: 'object',
        properties: {
          confirmar: { type: 'boolean', description: 'Confirmar exclusão total.' }
        },
        required: ['confirmar']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'atualizar_transacao',
      description: 'Atualiza uma transação existente pelo seu ID.',
      parameters: {
        type: 'object',
        properties: {
          transacao_id: { type: 'string', description: 'UUID da transação.' },
          descricao: { type: 'string', description: 'Nova descrição.' },
          valor: { type: 'number', description: 'Novo valor.' },
          categoria_nome: { type: 'string', description: 'Novo nome da categoria.' },
          metodo_pagamento: { type: 'string', description: 'Novo método de pagamento.' },
          tipo_transacao: { type: 'string', enum: ['despesa', 'receita', 'emprestimo_tomado', 'emprestimo_concedido'] }
        },
        required: ['transacao_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listar_categorias',
      description: 'Lista todas as categorias cadastradas no sistema.',
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['receita', 'despesa'] }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'criar_categoria',
      description: 'Cria uma nova categoria.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome da nova categoria.' },
          tipo: { type: 'string', enum: ['receita', 'despesa'] }
        },
        required: ['nome', 'tipo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deletar_categoria',
      description: 'Deleta uma categoria pelo ID.',
      parameters: {
        type: 'object',
        properties: {
          categoria_id: { type: 'string', description: 'UUID da categoria.' }
        },
        required: ['categoria_id']
      }
    }
  }
];

class GroqAgentService {
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Processes a user message using Groq Cloud AI Models with multi-model fallback and multi-item tool execution.
   */
  async processUserMessage(userMessage, usuario) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      throw new Error('GROQ_API_KEY environment variable is not defined.');
    }

    const groq = new Groq({ apiKey: groqKey });

    const candidateModels = [
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant', // 500,000 Tokens/Day limit!
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    const recentHistory = memoryService.getHistory(usuario.id);
    const hasHistory = recentHistory.length > 0;

    const systemPrompt = `Você é o assistente de finanças pessoais do WhatsApp para o usuário "${usuario.nome}".
Sua tarefa é ajudar o usuário a gerenciar suas finanças de forma contínua, natural, limpa e profissional.

Regras de Etiqueta e Diálogo:
- NÃO EXAGERE NO USO DE EMOJIS! Use no máximo 1 emoji discreto por mensagem.
- ${hasHistory ? 'A conversa JÁ ESTÁ EM ANDAMENTO. NUNCA diga "Olá", "Oi", "Tudo bem?" nem refaça sua apresentação inicial. Vá direto ao ponto!' : 'Esta é a primeira mensagem. Pode fazer uma saudação breve sem exageros.'}
- Se o usuário enviar agradecimentos ou confirmações simples (ex: "valeu", "obrigado", "obg", "vlw", "blz", "ok", "perfeito"), responda de forma breve e natural (ex: "Por nada! Se precisar de algo mais é só chamar."). NUNCA refaça sua apresentação inicial!

Regras Estritas de Classificação de Transações:
1. RECEITAS (ENTRADAS DE DINHEIRO):
   - Salário, pagamento recebido, rendimentos, dividendos, freelance, vendas, PIX recebido, presente em dinheiro, reembolso, cashback.
   - O tipo_transacao DEVE SER OBRIGATORIAMENTE "receita"!

2. DESPESAS (SAÍDAS DE DINHEIRO):
   - Mercado, almoço, jantar, Uber, aluguel, luz, água, contas em geral, compras, lazer, farmácia, assinaturas, cartão de crédito.
   - O tipo_transacao DEVE SER OBRIGATORIAMENTE "despesa"!

3. SE O USUÁRIO ENVIAR MÚLTIPLOS ITENS EM UMA ÚNICA MENSAGEM (ex: "Conta de agua 23 e luz 82"):
   - Chame a ferramenta "registrar_transacao" SEPARADAMENTE PARA CADA ITEM!

4. SE O USUÁRIO NÃO INFORMAR O VALOR EM REAIS:
   - NÃO tente registrar R$ 0,00! Pergunte a ele: "Qual o valor em Reais?" antes de chamar a ferramenta.

A data atual é: ${new Date().toLocaleDateString('pt-BR')} (considere este ano e mês para termos relativos como 'hoje', 'ontem', 'este mês').`;

    let lastError = null;

    for (const modelId of uniqueModels) {
      try {
        console.log(`🚀 [GROQ AI] Processing message for ${usuario.nome} with model: ${modelId}`);

        const messages = [
          { role: 'system', content: systemPrompt },
          ...recentHistory,
          { role: 'user', content: userMessage }
        ];

        let iterations = 0;
        const executedToolSignatures = new Set();
        let finalReply = '';

        while (iterations < 5) {
          iterations++;

          const completion = await groq.chat.completions.create({
            messages,
            model: modelId,
            tools: groqTools,
            tool_choice: 'auto',
            temperature: 0.1
          });

          const responseMessage = completion.choices[0].message;
          messages.push(responseMessage);

          // Check if tool calls were returned
          if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
            finalReply = responseMessage.content || 'Operação realizada com sucesso.';
            break;
          }

          // Execute tool calls
          for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            let args = {};

            try {
              args = typeof toolCall.function.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments;
            } catch (e) {
              args = {};
            }

            // Deduplication signature per tool call parameters
            const signature = `${functionName}_${args.descricao || ''}_${args.valor || ''}_${args.categoria_nome || ''}`;
            if (executedToolSignatures.has(signature)) {
              console.log(`⚠️ Skipping exact duplicate tool execution: [${signature}]`);
              continue;
            }

            console.log(`⚡ [GROQ Tool Call] Executing ${functionName} with args:`, args);

            try {
              const toolResult = await executeTool(functionName, args, { usuario });
              executedToolSignatures.add(signature);

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult)
              });
            } catch (err) {
              console.error(`❌ [GROQ Tool Error] ${functionName}:`, err);
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ status: 'erro', mensagem: err.message })
              });
            }
          }
        }

        if (!finalReply) {
          finalReply = 'Operação concluída com sucesso.';
        }

        // Save interaction to memory service
        memoryService.addUserMessage(usuario.id, userMessage);
        memoryService.addAssistantReply(usuario.id, finalReply);

        return finalReply;

      } catch (err) {
        lastError = err;
        console.warn(`⚠️ GROQ model ${modelId} failed (${err.status || err.message}). Trying fallback model...`);

        if (err.status === 429 || (err.message && err.message.includes('429'))) {
          console.warn(`⏳ Rate limit (429) on GROQ ${modelId}. Switching to next candidate model...`);
          await this.sleep(1000);
          continue;
        } else {
          continue;
        }
      }
    }

    throw lastError || new Error('All GROQ models failed.');
  }
}

module.exports = new GroqAgentService();
