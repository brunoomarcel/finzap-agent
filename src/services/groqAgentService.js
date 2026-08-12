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
          valor_limite: { type: 'number', description: 'Valor limite em Reais (ex: 500.00). OBRIGATÓRIO e maior que zero. NUNCA invente ou adivinhe este valor se o usuário não disser.' },
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
  },
  {
    type: 'function',
    function: {
      name: 'registrar_multiplas_transacoes',
      description: 'Registra um lote (lista) de múltiplas transações financeiras enviadas de uma só vez (relatórios, faturas, extratos).',
      parameters: {
        type: 'object',
        properties: {
          data_transacao: { type: 'string', description: 'Data padrão para todas as transações (opcional, YYYY-MM-DD).' },
          transacoes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                descricao: { type: 'string', description: 'Descrição da transação (ex: PicPay, Moto, Água).' },
                valor: { type: 'number', description: 'Valor numérico em Reais.' },
                tipo_transacao: { type: 'string', enum: ['despesa', 'receita', 'emprestimo_tomado', 'emprestimo_concedido'] },
                categoria_nome: { type: 'string', description: 'Nome da categoria (ex: Alimentação, Transporte, Moradia, Lazer, Salário).' },
                metodo_pagamento: { type: 'string', description: 'Forma de pagamento (ex: pix, cartao_credito, dinheiro).' }
              },
              required: ['descricao', 'valor', 'tipo_transacao']
            },
            description: 'Lista de transações a serem cadastradas em lote.'
          }
        },
        required: ['transacoes']
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
      'llama-3.1-8b-instant',
      'llama-3.3-70b-specdec',
      'llama-3.2-11b-vision-instruct'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    const recentHistory = memoryService.getHistory(usuario.id);
    const hasHistory = recentHistory.length > 0;

    const systemPrompt = `Você é o assistente virtual de finanças pessoais no WhatsApp do usuário "${usuario.nome}".
Sua função é gerenciar as finanças do usuário com máxima precisão, praticidade e cordialidade.

REGRAS DE REGISTRO E OBRIGATORIEDADE DE DADOS:
1. OBRIGATÓRIO (O QUE FOI + VALOR):
   - Uma transação SÓ DEVE SER REGISTRADA se o usuário informar EXPLICITAMENTE para o que foi (descrição) E o valor em Reais.
   - Se faltar o valor ou a descrição do que foi comprado/recebido, NÃO chame a ferramenta de registro! Pergunte educadamente o dado faltante ao usuário antes de registrar.

2. CONTROLE DE QUANTIDADE DE REGISTROS:
   - NUNCA adicione mais de um registro de transação se foi solicitado apenas um! Chame a ferramenta "registrar_transacao" EXATAMENTE 1 VEZ por item solicitado pelo usuário.

3. TRATAMENTO DE DATAS E PARCELAMENTOS:
   - Se o usuário comprou algo (parcelado ou à vista) e disser a data (ex: "comprei dia 05/07", "foi mês passado"), considere e passe essa data no parâmetro "data_transacao". O sistema estipulará as próximas parcelas mensalmente a partir dessa data informada.
   - Se o usuário NÃO disser a data, considere a data atual do cadastro (${new Date().toLocaleDateString('pt-BR')}).

4. EDIÇÃO DE TRANSAÇÕES:
   - Se o usuário quiser editar ou corrigir uma transação existente (ex: "altera o valor do mercado para 60", "muda a categoria de Uber"), ele pode editar. Utilize a ferramenta "atualizar_transacao" para realizar os ajustes solicitados.

5. REGRAS DE CLASSIFICAÇÃO:
   - ENTRADAS DE DINHEIRO (Salário, PIX recebido, vendas, reembolso, rendimentos) = "receita".
   - SAÍDAS DE DINHEIRO (Mercado, contas, compras, almoço, Uber, lazer) = "despesa".

6. MONITORAMENTO E ALERTAS DE LIMITES DE GASTOS:
   - NUNCA INVENTE OU ADIVINHE O VALOR DE UM LIMITE! Se o usuário disser apenas o nome da categoria (ex: "Higiene") sem informar o valor limite em Reais, NÃO CHAME a ferramenta 'definir_limite_gasto'. Pergunte educadamente: "Qual o valor limite em Reais que deseja definir para a categoria Higiene?".
   - Se o retorno da ferramenta contiver um "alerta_limite", ou se o usuário perguntar quanto pode gastar (ex: "quanto ainda posso gastar em Alimentação?", "como está meu limite?"), INFORME proativamente o status do orçamento, o limite total estipulado, quanto já foi consumido e quanto ele AINDA PODE GASTAR.
   - Dê avisos claros quando o usuário atingir 80% do limite ou estourar o teto estipulado, sugerindo moderação ou ajustes com empatia.

7. CONSULTA PROATIVA DE DADOS CADASTRADOS (SALÁRIO, RECEITAS E METAS):
   - NUNCA diga 'não tenho acesso ao seu salário' ou 'não sei suas finanças'! Você TEM ACESSO TOTAL às ferramentas de banco de dados (obter_resumo_financeiro, listar_transacoes, listar_limites_gastos).
   - Sempre que o usuário mencionar 'meu salário', 'quanto eu ganho', 'minhas receitas' ou estabelecer metas baseadas no salário (ex: 'quero economizar 20% do meu salário'), CHAME A FERRAMENTA 'obter_resumo_financeiro' ou 'listar_transacoes' antes de responder.
   - Com o valor do salário consultado (ex: R$ 4.320,00), faça o cálculo exato solicitado (ex: 20% = R$ 864,00 de economia mensal, teto limite máximo de gastos = R$ 3.456,00) e responda com clareza, sugerindo a configuração do limite.

8. CADASTRO DE MÚLTIPLAS TRANSAÇÕES EM LOTE (RELATÓRIOS E FATURAS):
   - Se o usuário enviar um relatório, lista, resumo ou fatura contendo vários itens de uma só vez (ex: "EMDAGRO R$ 4200, PicPay R$ 2128, Moto R$ 904, Água R$ 23..."), você DEVE OBRIGATORIAMENTE chamar a ferramenta 'registrar_multiplas_transacoes' enviando a lista completa de todos os itens extraídos da mensagem de uma única vez!
   - NUNCA responda dizendo "adicionei" ou "dados salvos" sem ter executado a ferramenta 'registrar_multiplas_transacoes' ou 'registrar_transacao' primeiro!

9. ENCERRAMENTO E CORDIALIDADE:
   - Se o usuário não demonstrar mais interesse em adicionar nada, ou se despedir/agradecer (ex: "valeu", "obrigado", "por hoje é só", "não preciso de mais nada", "tchau"), encerre a conversa de forma extremamente cordial, amigável e afirme que está sempre à disposição para quando ele precisar.

${hasHistory ? 'A conversa JÁ ESTÁ EM ANDAMENTO. Não refaça sua apresentação inicial nem repetitivas saudações. Vá direto ao ponto!' : 'Esta é a primeira mensagem. Pode fazer uma recepção breve e atenciosa.'}`;

    let lastError = null;

    for (const modelId of uniqueModels) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`🚀 [GROQ AI] Processing message for ${usuario.nome} with model: ${modelId} (attempt ${attempts})`);

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
          const status = err.status || err.statusCode;
          console.warn(`⚠️ GROQ model ${modelId} failed on attempt ${attempts} (${status || err.message}).`);

          if ((status === 429 || (err.message && err.message.includes('429'))) && attempts < maxAttempts) {
            console.warn(`⏳ Rate limit (429) on GROQ ${modelId}. Waiting 2.5s before retry...`);
            await this.sleep(2500);
            continue;
          }
          break; // Move to next model if non-429 or max attempts reached for this model
        }
      }
    }

    console.error('❌ All GROQ models failed:', lastError?.message || lastError);
    return 'Desculpe, meu sistema de inteligência artificial está temporariamente sobrecarregado no momento. Por favor, envie sua mensagem novamente em alguns instantes!';
  }
}

module.exports = new GroqAgentService();
