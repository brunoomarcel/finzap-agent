const prisma = require('../config/prisma');
const supabase = require('../config/supabase');

/**
 * Service to handle database operations for:
 * - usuarios
 * - categorias
 * - limites_gastos
 * - transacoes
 * 
 * Uses Prisma ORM as primary database layer, with fallback to Supabase SDK if DATABASE_URL is not set.
 */
class SupabaseService {
  static cleanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  // ==========================================
  // USUARIOS
  // ==========================================

  async findUserByPhone(phone) {
    const rawDigits = SupabaseService.cleanPhone(phone);
    if (!rawDigits) return null;

    try {
      if (process.env.DATABASE_URL) {
        const users = await prisma.usuario.findMany({
          where: { ativo: true }
        });
        return users.find(u => {
          const uDigits = SupabaseService.cleanPhone(u.telefone);
          return uDigits === rawDigits || uDigits.endsWith(rawDigits) || rawDigits.endsWith(uDigits);
        }) || null;
      }
    } catch (err) {
      console.warn('Prisma query error, attempting Supabase SDK fallback:', err.message);
    }

    // Fallback to Supabase SDK
    const { data } = await supabase.from('usuarios').select('*').eq('ativo', true);
    if (!data) return null;

    return data.find(u => {
      const uDigits = SupabaseService.cleanPhone(u.telefone);
      return uDigits === rawDigits || uDigits.endsWith(rawDigits) || rawDigits.endsWith(uDigits);
    }) || null;
  }

  async listUsers() {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.usuario.findMany({
          orderBy: { createdAt: 'desc' }
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async createUser({ nome, telefone, ativo = true }) {
    const cleanPhoneNum = SupabaseService.cleanPhone(telefone);
    const finalPhone = cleanPhoneNum || telefone;

    try {
      if (process.env.DATABASE_URL) {
        return await prisma.usuario.create({
          data: { nome, telefone: finalPhone, ativo }
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ nome, telefone: finalPhone, ativo }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id, updates) {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.usuario.update({
          where: { id },
          data: updates
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('usuarios').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteUser(id) {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.usuario.delete({
          where: { id }
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('usuarios').delete().eq('id', id).select();
    if (error) throw error;
    return data;
  }

  // ==========================================
  // CATEGORIAS
  // ==========================================

  async listCategories(tipo = null) {
    try {
      if (process.env.DATABASE_URL) {
        const where = tipo ? { tipo } : {};
        return await prisma.categoria.findMany({
          where,
          orderBy: { nome: 'asc' }
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    let query = supabase.from('categorias').select('*').order('nome');
    if (tipo) query = query.eq('tipo', tipo);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findCategoryByName(nome) {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.categoria.findFirst({
          where: {
            nome: {
              contains: nome.trim(),
              mode: 'insensitive'
            }
          }
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data } = await supabase.from('categorias').select('*').ilike('nome', `%${nome.trim()}%`).limit(1);
    return data && data.length > 0 ? data[0] : null;
  }

  async createCategory({ nome, tipo }) {
    if (!['receita', 'despesa'].includes(tipo)) {
      throw new Error('Tipo de categoria deve ser "receita" ou "despesa".');
    }

    try {
      if (process.env.DATABASE_URL) {
        return await prisma.categoria.create({
          data: { nome, tipo }
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('categorias').insert([{ nome, tipo }]).select().single();
    if (error) throw error;
    return data;
  }

  async updateCategory(id, updates) {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.categoria.update({
          where: { id },
          data: updates
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('categorias').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteCategory(id) {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.categoria.delete({
          where: { id }
        });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('categorias').delete().eq('id', id).select();
    if (error) throw error;
    return data;
  }

  // ==========================================
  // LIMITES DE GASTOS
  // ==========================================

  async listLimits(usuarioId, mesAno = null) {
    try {
      if (process.env.DATABASE_URL) {
        const where = { usuarioId };
        if (mesAno) where.mesAno = mesAno;
        const result = await prisma.limiteGasto.findMany({
          where,
          include: { categoria: true }
        });
        return result.map(l => ({
          ...l,
          usuario_id: l.usuarioId,
          categoria_id: l.categoriaId,
          valor_limite: parseFloat(l.valorLimite.toString()),
          mes_ano: l.mesAno
        }));
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    let query = supabase.from('limites_gastos').select('*, categoria:categorias(id, nome, tipo)').eq('usuario_id', usuarioId);
    if (mesAno) query = query.eq('mes_ano', mesAno);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async setLimit({ usuario_id, categoria_id, valor_limite, mes_ano }) {
    try {
      if (process.env.DATABASE_URL) {
        const existing = await prisma.limiteGasto.findFirst({
          where: {
            usuarioId: usuario_id,
            categoriaId: categoria_id,
            mesAno: mes_ano
          }
        });

        if (existing) {
          const updated = await prisma.limiteGasto.update({
            where: { id: existing.id },
            data: { valorLimite: valor_limite }
          });
          return {
            ...updated,
            usuario_id: updated.usuarioId,
            categoria_id: updated.categoriaId,
            valor_limite: parseFloat(updated.valorLimite.toString()),
            mes_ano: updated.mesAno
          };
        } else {
          const created = await prisma.limiteGasto.create({
            data: {
              usuarioId: usuario_id,
              categoriaId: categoria_id,
              valorLimite: valor_limite,
              mesAno: mes_ano
            }
          });
          return {
            ...created,
            usuario_id: created.usuarioId,
            categoria_id: created.categoriaId,
            valor_limite: parseFloat(created.valorLimite.toString()),
            mes_ano: created.mesAno
          };
        }
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data: existing } = await supabase.from('limites_gastos').select('id').eq('usuario_id', usuario_id).eq('categoria_id', categoria_id).eq('mes_ano', mes_ano).single();
    if (existing) {
      const { data, error } = await supabase.from('limites_gastos').update({ valor_limite }).eq('id', existing.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('limites_gastos').insert([{ usuario_id, categoria_id, valor_limite, mes_ano }]).select().single();
      if (error) throw error;
      return data;
    }
  }

  async deleteLimit(id) {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.limiteGasto.delete({ where: { id } });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('limites_gastos').delete().eq('id', id).select();
    if (error) throw error;
    return data;
  }

  // ==========================================
  // TRANSAÇÕES
  // ==========================================

  async createTransaction({
    usuario_id,
    categoria_id = null,
    categoria_nome = null,
    descricao,
    valor,
    tipo_transacao = 'despesa',
    metodo_pagamento = 'pix',
    eh_parcelado = false,
    parcela_atual = 1,
    total_parcelas = 1,
    data_transacao = new Date().toISOString()
  }) {
    if (!categoria_id && categoria_nome) {
      const cat = await this.findCategoryByName(categoria_nome);
      if (cat) categoria_id = cat.id;
    }

    const totalParcelasNum = parseInt(total_parcelas, 10) || 1;
    const ehParceladoBool = eh_parcelado || totalParcelasNum > 1;

    if (ehParceladoBool && totalParcelasNum > 1) {
      const valorParcela = (parseFloat(valor) / totalParcelasNum).toFixed(2);
      const dataBase = new Date(data_transacao);

      // Create main installment (1/N)
      const paiTrans = await this._insertSingleTransaction({
        usuarioId: usuario_id,
        categoriaId: categoria_id,
        descricao: `${descricao} (1/${totalParcelasNum})`,
        valor: parseFloat(valorParcela),
        tipoTransacao: tipo_transacao,
        metodoPagamento: metodo_pagamento,
        ehParcelado: true,
        parcelaAtual: 1,
        totalParcelas: totalParcelasNum,
        dataTransacao: dataBase
      });

      const parcelasCriadas = [paiTrans];

      for (let i = 2; i <= totalParcelasNum; i++) {
        const dataProxima = new Date(dataBase);
        dataProxima.setMonth(dataBase.getMonth() + (i - 1));

        const childTrans = await this._insertSingleTransaction({
          usuarioId: usuario_id,
          categoriaId: categoria_id,
          descricao: `${descricao} (${i}/${totalParcelasNum})`,
          valor: parseFloat(valorParcela),
          tipoTransacao: tipo_transacao,
          metodoPagamento: metodo_pagamento,
          ehParcelado: true,
          parcelaAtual: i,
          totalParcelas: totalParcelasNum,
          transacaoPaiId: paiTrans.id,
          dataTransacao: dataProxima
        });

        if (childTrans) parcelasCriadas.push(childTrans);
      }

      return {
        transacao: paiTrans,
        mensagem: `Transação parcelada em ${totalParcelasNum}x de R$ ${valorParcela} criada com sucesso!`,
        total_parcelas: totalParcelasNum,
        parcelas: parcelasCriadas
      };
    } else {
      return await this._insertSingleTransaction({
        usuarioId: usuario_id,
        categoriaId: categoria_id,
        descricao,
        valor: parseFloat(valor),
        tipoTransacao: tipo_transacao,
        metodoPagamento: metodo_pagamento,
        ehParcelado: false,
        parcelaAtual: 1,
        totalParcelas: 1,
        dataTransacao: new Date(data_transacao)
      });
    }
  }

  async _insertSingleTransaction(data) {
    try {
      if (process.env.DATABASE_URL) {
        const res = await prisma.transacao.create({
          data,
          include: { categoria: true }
        });
        return {
          ...res,
          usuario_id: res.usuarioId,
          categoria_id: res.categoriaId,
          tipo_transacao: res.tipoTransacao,
          metodo_pagamento: res.metodoPagamento,
          eh_parcelado: res.ehParcelado,
          parcela_atual: res.parcelaAtual,
          total_parcelas: res.totalParcelas,
          transacao_pai_id: res.transacaoPaiId,
          data_transacao: res.dataTransacao,
          valor: parseFloat(res.valor.toString())
        };
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data: res, error } = await supabase
      .from('transacoes')
      .insert([{
        usuario_id: data.usuarioId,
        categoria_id: data.categoriaId,
        descricao: data.descricao,
        valor: data.valor,
        tipo_transacao: data.tipoTransacao,
        metodo_pagamento: data.metodoPagamento,
        eh_parcelado: data.ehParcelado,
        parcela_atual: data.parcelaAtual,
        total_parcelas: data.totalParcelas,
        transacao_pai_id: data.transacaoPaiId,
        data_transacao: data.dataTransacao.toISOString()
      }])
      .select('*, categoria:categorias(id, nome, tipo)')
      .single();

    if (error) throw error;
    return res;
  }

  async listTransactions(usuarioId, options = {}) {
    const { limit = 20, data_inicio, data_fim, tipo_transacao, categoria_id } = options;

    try {
      if (process.env.DATABASE_URL) {
        const where = { usuarioId };
        if (tipo_transacao) where.tipoTransacao = tipo_transacao;
        if (categoria_id) where.categoriaId = categoria_id;
        if (data_inicio || data_fim) {
          where.dataTransacao = {};
          if (data_inicio) where.dataTransacao.gte = new Date(data_inicio);
          if (data_fim) where.dataTransacao.lte = new Date(data_fim);
        }

        const res = await prisma.transacao.findMany({
          where,
          take: limit ? parseInt(limit, 10) : 20,
          orderBy: { dataTransacao: 'desc' },
          include: { categoria: true }
        });

        return res.map(t => ({
          ...t,
          usuario_id: t.usuarioId,
          categoria_id: t.categoriaId,
          tipo_transacao: t.tipoTransacao,
          metodo_pagamento: t.metodoPagamento,
          eh_parcelado: t.ehParcelado,
          parcela_atual: t.parcelaAtual,
          total_parcelas: t.totalParcelas,
          transacao_pai_id: t.transacaoPaiId,
          data_transacao: t.dataTransacao,
          valor: parseFloat(t.valor.toString())
        }));
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    let query = supabase.from('transacoes').select('*, categoria:categorias(id, nome, tipo)').eq('usuario_id', usuarioId).order('data_transacao', { ascending: false });
    if (limit) query = query.limit(limit);
    if (tipo_transacao) query = query.eq('tipo_transacao', tipo_transacao);
    if (categoria_id) query = query.eq('categoria_id', categoria_id);
    if (data_inicio) query = query.gte('data_transacao', data_inicio);
    if (data_fim) query = query.lte('data_transacao', data_fim);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async updateTransaction(id, updates) {
    const dataToUpdate = {};
    if (updates.descricao) dataToUpdate.descricao = updates.descricao;
    if (updates.valor) dataToUpdate.valor = updates.valor;
    if (updates.metodo_pagamento) dataToUpdate.metodoPagamento = updates.metodo_pagamento;
    if (updates.tipo_transacao) dataToUpdate.tipoTransacao = updates.tipo_transacao;
    if (updates.categoria_id) dataToUpdate.categoriaId = updates.categoria_id;

    try {
      if (process.env.DATABASE_URL) {
        const res = await prisma.transacao.update({
          where: { id },
          data: dataToUpdate,
          include: { categoria: true }
        });
        return {
          ...res,
          usuario_id: res.usuarioId,
          categoria_id: res.categoriaId,
          tipo_transacao: res.tipoTransacao,
          metodo_pagamento: res.metodoPagamento,
          valor: parseFloat(res.valor.toString())
        };
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('transacoes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteTransaction(id) {
    try {
      if (process.env.DATABASE_URL) {
        return await prisma.transacao.delete({ where: { id } });
      }
    } catch (err) {
      console.warn('Prisma error:', err.message);
    }

    const { data, error } = await supabase.from('transacoes').delete().eq('id', id).select();
    if (error) throw error;
    return data;
  }

  async getFinancialSummary(usuarioId, mesAno = null) {
    const targetDate = mesAno ? new Date(`${mesAno}-01`) : new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const formattedMesAno = `${year}-${month}`;

    const startOfMonth = new Date(year, targetDate.getMonth(), 1);
    const endOfMonth = new Date(year, targetDate.getMonth() + 1, 0, 23, 59, 59);

    const transacoes = await this.listTransactions(usuarioId, {
      data_inicio: startOfMonth.toISOString(),
      data_fim: endOfMonth.toISOString(),
      limit: 500
    });

    const limites = await this.listLimits(usuarioId, formattedMesAno);

    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalEmprestimosTomados = 0;
    let totalEmprestimosConcedidos = 0;
    const porCategoria = {};

    (transacoes || []).forEach(t => {
      const val = parseFloat(t.valor) || 0;
      const catNome = t.categoria ? t.categoria.nome : 'Sem Categoria';

      if (!porCategoria[catNome]) porCategoria[catNome] = 0;

      if (t.tipo_transacao === 'receita') {
        totalReceitas += val;
      } else if (t.tipo_transacao === 'despesa') {
        totalDespesas += val;
        porCategoria[catNome] += val;
      } else if (t.tipo_transacao === 'emprestimo_tomado') {
        totalEmprestimosTomados += val;
      } else if (t.tipo_transacao === 'emprestimo_concedido') {
        totalEmprestimosConcedidos += val;
      }
    });

    const statusLimites = limites.map(lim => {
      const catNome = lim.categoria ? lim.categoria.nome : 'Geral';
      const gastoAtual = porCategoria[catNome] || 0;
      const percentual = lim.valor_limite > 0 ? ((gastoAtual / lim.valor_limite) * 100).toFixed(1) : 0;
      return {
        categoria: catNome,
        valor_limite: lim.valor_limite,
        gasto_atual: gastoAtual,
        saldo_disponivel: lim.valor_limite - gastoAtual,
        percentual_usado: `${percentual}%`,
        excedido: gastoAtual > lim.valor_limite
      };
    });

    return {
      mes_ano: formattedMesAno,
      total_receitas: totalReceitas,
      total_despesas: totalDespesas,
      saldo_liquido: totalReceitas - totalDespesas,
      total_emprestimos_tomados: totalEmprestimosTomados,
      total_emprestimos_concedidos: totalEmprestimosConcedidos,
      gastos_por_categoria: porCategoria,
      status_limites: statusLimites,
      total_transacoes: (transacoes || []).length
    };
  }
}

module.exports = new SupabaseService();
