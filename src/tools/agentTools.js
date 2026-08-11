const supabaseService = require('../services/supabaseService');

/**
 * Gemini Function Calling Tool Definitions and Executors
 */

const toolDeclarations = [
  {
    name: 'registrar_transacao',
    description: 'Registra uma nova transação financeira (despesa, receita, empréstimo tomado ou concedido), incluindo parcelamentos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        descricao: { type: 'STRING', description: 'Descrição da transação (ex: Mercado, Salário, Aluguel, Almoço).' },
        valor: { type: 'NUMBER', description: 'Valor numérico em Reais (ex: 45.90).' },
        tipo_transacao: {
          type: 'STRING',
          enum: ['despesa', 'receita', 'emprestimo_tomado', 'emprestimo_concedido'],
          description: 'Tipo de transação. Padrão: despesa.'
        },
        metodo_pagamento: {
          type: 'STRING',
          enum: ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'outros'],
          description: 'Forma de pagamento utilizada.'
        },
        categoria_nome: { type: 'STRING', description: 'Nome da categoria (ex: Alimentação, Transporte, Moradia, Lazer, Saúde, Salário).' },
        eh_parcelado: { type: 'BOOLEAN', description: 'Se true, indica que a compra é parcelada.' },
        total_parcelas: { type: 'INTEGER', description: 'Quantidade total de parcelas (ex: 3, 10, 12).' },
        data_transacao: { type: 'STRING', description: 'Data da transação no formato ISO ou YYYY-MM-DD (opcional, padrão: agora).' }
      },
      required: ['descricao', 'valor']
    }
  },
  {
    name: 'listar_transacoes',
    description: 'Lista e consulta os lançamentos/transações do usuário com filtros opcionais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Quantidade máxima de registros a retornar (padrão: 10).' },
        tipo_transacao: { type: 'STRING', enum: ['despesa', 'receita', 'emprestimo_tomado', 'emprestimo_concedido'], description: 'Filtrar por tipo.' },
        data_inicio: { type: 'STRING', description: 'Data inicial para filtro (YYYY-MM-DD).' },
        data_fim: { type: 'STRING', description: 'Data final para filtro (YYYY-MM-DD).' }
      }
    }
  },
  {
    name: 'obter_resumo_financeiro',
    description: 'Obtém o resumo financeiro do mês (total de receitas, despesas, saldo, limite por categoria e alertas).',
    parameters: {
      type: 'OBJECT',
      properties: {
        mes_ano: { type: 'STRING', description: 'Ano e mês no formato YYYY-MM (ex: 2026-08). Opcional, padrão: mês atual.' }
      }
    }
  },
  {
    name: 'definir_limite_gasto',
    description: 'Define ou atualiza um teto/limite de gastos mensal para uma categoria específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoria_nome: { type: 'STRING', description: 'Nome da categoria (ex: Alimentação, Lazer).' },
        valor_limite: { type: 'NUMBER', description: 'Valor limite em Reais (ex: 500.00).' },
        mes_ano: { type: 'STRING', description: 'Mês e ano no formato YYYY-MM (ex: 2026-08). Opcional, padrão: mês atual.' }
      },
      required: ['categoria_nome', 'valor_limite']
    }
  },
  {
    name: 'listar_limites_gastos',
    description: 'Lista os limites de gastos configurados e a situação atual do orçamento.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mes_ano: { type: 'STRING', description: 'Mês e ano no formato YYYY-MM (ex: 2026-08).' }
      }
    }
  },
  {
    name: 'deletar_transacao',
    description: 'Exclui uma transação pelo seu ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        transacao_id: { type: 'STRING', description: 'UUID da transação a ser deletada.' }
      },
      required: ['transacao_id']
    }
  },
  {
    name: 'deletar_multiplas_transacoes',
    description: 'Exclui múltiplas transações fornecendo uma lista de IDs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        transacao_ids: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Lista de UUIDs de transações para excluir.'
        }
      },
      required: ['transacao_ids']
    }
  },
  {
    name: 'limpar_todas_transacoes',
    description: 'Exclui TODAS as transações cadastradas do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        confirmar: { type: 'BOOLEAN', description: 'Deve ser true para confirmar a exclusão de todo o histórico.' }
      },
      required: ['confirmar']
    }
  },
  {
    name: 'atualizar_transacao',
    description: 'Atualiza informações de uma transação existente pelo seu ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        transacao_id: { type: 'STRING', description: 'UUID da transação.' },
        descricao: { type: 'STRING', description: 'Nova descrição.' },
        valor: { type: 'NUMBER', description: 'Novo valor.' },
        categoria_nome: { type: 'STRING', description: 'Novo nome da categoria.' },
        metodo_pagamento: { type: 'STRING', description: 'Novo método de pagamento.' }
      },
      required: ['transacao_id']
    }
  },
  {
    name: 'listar_categorias',
    description: 'Lista todas as categorias cadastradas no sistema.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: { type: 'STRING', enum: ['receita', 'despesa'], description: 'Filtrar por tipo (opcional).' }
      }
    }
  },
  {
    name: 'criar_categoria',
    description: 'Cria uma nova categoria de receita ou despesa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nome: { type: 'STRING', description: 'Nome da nova categoria.' },
        tipo: { type: 'STRING', enum: ['receita', 'despesa'], description: 'Tipo da categoria.' }
      },
      required: ['nome', 'tipo']
    }
  },
  {
    name: 'deletar_categoria',
    description: 'Deleta uma categoria pelo ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoria_id: { type: 'STRING', description: 'UUID da categoria.' }
      },
      required: ['categoria_id']
    }
  }
];

/**
 * Handles execution of tool calls triggered by Gemini.
 */
async function executeTool(toolName, args, context) {
  const user = context.usuario;
  if (!user || !user.id) {
    throw new Error('Usuário não autenticado ou não encontrado no sistema.');
  }

  const userId = user.id;

  switch (toolName) {
    case 'registrar_transacao': {
      const res = await supabaseService.createTransaction({
        usuario_id: userId,
        descricao: args.descricao,
        valor: args.valor,
        tipo_transacao: args.tipo_transacao || 'despesa',
        metodo_pagamento: args.metodo_pagamento || 'pix',
        categoria_nome: args.categoria_nome,
        eh_parcelado: args.eh_parcelado || false,
        total_parcelas: args.total_parcelas || 1,
        data_transacao: args.data_transacao || new Date().toISOString()
      });

      let alertaLimite = null;
      if (args.categoria_nome) {
        const cat = await supabaseService.findCategoryByName(args.categoria_nome);
        if (cat) {
          const now = new Date();
          const mesAno = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const limites = await supabaseService.listLimits(userId, mesAno);
          const limiteCat = limites.find(l => l.categoria_id === cat.id);
          if (limiteCat) {
            const summary = await supabaseService.getFinancialSummary(userId, mesAno);
            const gastoCat = summary.gastos_por_categoria[cat.nome] || 0;
            if (gastoCat > limiteCat.valor_limite) {
              alertaLimite = `🚨 *ALERTA DE LIMITE*: Você ultrapassou o limite de R$ ${limiteCat.valor_limite.toFixed(2)} para ${cat.nome}! Total atual: R$ ${gastoCat.toFixed(2)}`;
            } else if (gastoCat >= limiteCat.valor_limite * 0.8) {
              alertaLimite = `⚠️ *AVISO*: Você já atingiu ${(gastoCat/limiteCat.valor_limite * 100).toFixed(0)}% do seu limite de ${cat.nome} (R$ ${gastoCat.toFixed(2)} de R$ ${limiteCat.valor_limite.toFixed(2)}).`;
            }
          }
        }
      }

      return {
        status: 'sucesso',
        dados: res,
        alerta_limite: alertaLimite
      };
    }

    case 'listar_transacoes': {
      const trans = await supabaseService.listTransactions(userId, args);
      return {
        status: 'sucesso',
        total: trans.length,
        transacoes: trans
      };
    }

    case 'obter_resumo_financeiro': {
      const summary = await supabaseService.getFinancialSummary(userId, args.mes_ano);
      return {
        status: 'sucesso',
        resumo: summary
      };
    }

    case 'definir_limite_gasto': {
      let cat = await supabaseService.findCategoryByName(args.categoria_nome);
      if (!cat) {
        cat = await supabaseService.createCategory({
          nome: args.categoria_nome,
          tipo: 'despesa'
        });
      }

      const now = new Date();
      const mesAno = args.mes_ano || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const res = await supabaseService.setLimit({
        usuario_id: userId,
        categoria_id: cat.id,
        valor_limite: args.valor_limite,
        mes_ano: mesAno
      });

      return {
        status: 'sucesso',
        mensagem: `Limite de R$ ${args.valor_limite.toFixed(2)} definido para a categoria ${cat.nome} no mês ${mesAno}.`,
        limite: res
      };
    }

    case 'listar_limites_gastos': {
      const now = new Date();
      const mesAno = args.mes_ano || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const summary = await supabaseService.getFinancialSummary(userId, mesAno);
      return {
        status: 'sucesso',
        mes_ano: mesAno,
        limites: summary.status_limites
      };
    }

    case 'deletar_transacao': {
      const res = await supabaseService.deleteTransaction(args.transacao_id);
      return {
        status: 'sucesso',
        mensagem: 'Transação excluída com sucesso.',
        resultado: res
      };
    }

    case 'deletar_multiplas_transacoes': {
      const res = await supabaseService.deleteTransactions(args.transacao_ids);
      return {
        status: 'sucesso',
        mensagem: `${res.count} transações foram excluídas com sucesso.`
      };
    }

    case 'limpar_todas_transacoes': {
      if (args.confirmar) {
        const res = await supabaseService.deleteAllTransactions(userId);
        return {
          status: 'sucesso',
          mensagem: `Todas as ${res.count} transações do usuário foram excluídas com sucesso.`
        };
      }
      return { status: 'cancelado', mensagem: 'Operação cancelada (requer confirmação).' };
    }

    case 'atualizar_transacao': {
      const updates = {};
      if (args.descricao) updates.descricao = args.descricao;
      if (args.valor) updates.valor = parseFloat(args.valor);
      if (args.metodo_pagamento) updates.metodo_pagamento = args.metodo_pagamento;
      if (args.categoria_nome) {
        const cat = await supabaseService.findCategoryByName(args.categoria_nome);
        if (cat) updates.categoria_id = cat.id;
      }

      const res = await supabaseService.updateTransaction(args.transacao_id, updates);
      return {
        status: 'sucesso',
        mensagem: 'Transação atualizada com sucesso.',
        transacao: res
      };
    }

    case 'listar_categorias': {
      const cats = await supabaseService.listCategories(args.tipo);
      return {
        status: 'sucesso',
        total: cats.length,
        categorias: cats
      };
    }

    case 'criar_categoria': {
      const cat = await supabaseService.createCategory({
        nome: args.nome,
        tipo: args.tipo
      });
      return {
        status: 'sucesso',
        categoria: cat
      };
    }

    case 'deletar_categoria': {
      const res = await supabaseService.deleteCategory(args.categoria_id);
      return {
        status: 'sucesso',
        mensagem: 'Categoria excluída com sucesso.',
        resultado: res
      };
    }

    default:
      throw new Error(`Ferramenta '${toolName}' não reconhecida.`);
  }
}

module.exports = {
  toolDeclarations,
  executeTool
};
