const Groq = require('groq-sdk');
const { executeTool } = require('../tools/agentTools');

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
          valor: { type: 'number', description: 'Valor numérico em Reais (ex: 45.90).' },
          tipo_transacao: {
            type: 'string',
            enum: ['despesa', 'receita', 'emprestimo_tomado', 'emprestimo_concedido'],
            description: 'Tipo de transação. Padrão: despesa.'
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
        required: ['descricao', 'valor']
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
          metodo_pagamento: { type: 'string', description: 'Novo método de pagamento.' }
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
  /**
   * Processes a user message using Groq Cloud AI Models (Ultra-fast & high rate limits).
   */
  async processUserMessage(userMessage, usuario) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    console.log(`🚀 [GROQ AI] Processing message with model: ${model}`);

    const systemPrompt = `Você é o assistente de finanças pessoais do WhatsApp para o usuário "${usuario.nome}".
Sua tarefa é ajudar o usuário a gerenciar suas finanças com agilidade, clareza e educação.

Diretrizes:
1. Responda em português do Brasil com tom amigável e direto (use emojis apropriados para WhatsApp).
2. O usuário pode enviar gastos, receitas, limites ou consultas (ex: "Gastei 50 no Uber", "Qual o meu saldo?", "Quanto recebi este mês?").
3. Use as ferramentas disponíveis para consultar ou registrar dados diretamente no banco de dados.
4. A data atual é: ${new Date().toLocaleDateString('pt-BR')} (considere este ano e mês para termos relativos como 'hoje', 'ontem', 'este mês').`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    let iterations = 0;
    let mutationExecuted = false;

    while (iterations < 5) {
      iterations++;

      const completion = await groq.chat.completions.create({
        messages,
        model,
        tools: groqTools,
        tool_choice: 'auto',
        temperature: 0.2
      });

      const responseMessage = completion.choices[0].message;
      messages.push(responseMessage);

      // Check if tool calls were returned
      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        return responseMessage.content || 'Operação realizada com sucesso!';
      }

      // Execute tool calls
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let args = {};

        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          args = {};
        }

        console.log(`⚡ [GROQ Tool Call] Executing ${functionName} with args:`, args);

        if (['registrar_transacao', 'deletar_transacao', 'deletar_multiplas_transacoes', 'limpar_todas_transacoes', 'atualizar_transacao', 'criar_categoria', 'deletar_categoria', 'definir_limite_gasto'].includes(functionName)) {
          if (mutationExecuted) {
            console.log(`⚠️ Skipping duplicate mutation tool [${functionName}]`);
            continue;
          }
        }

        try {
          const toolResult = await executeTool(functionName, args, { usuario });

          if (['registrar_transacao', 'deletar_transacao', 'deletar_multiplas_transacoes', 'limpar_todas_transacoes', 'atualizar_transacao', 'criar_categoria', 'deletar_categoria', 'definir_limite_gasto'].includes(functionName)) {
            mutationExecuted = true;
          }

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

    return 'Operação concluída com sucesso!';
  }
}

module.exports = new GroqAgentService();
