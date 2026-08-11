const supabaseService = require('../services/supabaseService');

class ApiController {
  // Users
  async getUsers(req, res) {
    try {
      const users = await supabaseService.listUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createUser(req, res) {
    try {
      const { nome, telefone, ativo } = req.body;
      if (!nome || !telefone) {
        return res.status(400).json({ success: false, error: 'Nome e telefone são obrigatórios.' });
      }
      const user = await supabaseService.createUser({ nome, telefone, ativo });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await supabaseService.updateUser(id, req.body);
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      await supabaseService.deleteUser(id);
      res.json({ success: true, message: 'Usuário removido.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Categories
  async getCategories(req, res) {
    try {
      const { tipo } = req.query;
      const categories = await supabaseService.listCategories(tipo);
      res.json({ success: true, data: categories });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createCategory(req, res) {
    try {
      const { nome, tipo } = req.body;
      if (!nome || !tipo) {
        return res.status(400).json({ success: false, error: 'Nome e tipo são obrigatórios.' });
      }
      const category = await supabaseService.createCategory({ nome, tipo });
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      await supabaseService.deleteCategory(id);
      res.json({ success: true, message: 'Categoria removida.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Transactions
  async getTransactions(req, res) {
    try {
      const { usuario_id, limit, tipo_transacao, data_inicio, data_fim } = req.query;

      if (!usuario_id) {
        return res.status(400).json({ success: false, error: 'usuario_id é obrigatório.' });
      }

      const transactions = await supabaseService.listTransactions(usuario_id, {
        limit: limit ? parseInt(limit, 10) : 50,
        tipo_transacao,
        data_inicio,
        data_fim
      });

      res.json({ success: true, data: transactions });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createTransaction(req, res) {
    try {
      const trans = await supabaseService.createTransaction(req.body);
      res.status(201).json({ success: true, data: trans });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      await supabaseService.deleteTransaction(id);
      res.json({ success: true, message: 'Transação removida.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Summary & Limits
  async getSummary(req, res) {
    try {
      const { usuario_id, mes_ano } = req.query;
      if (!usuario_id) {
        return res.status(400).json({ success: false, error: 'usuario_id é obrigatório.' });
      }

      const summary = await supabaseService.getFinancialSummary(usuario_id, mes_ano);
      res.json({ success: true, data: summary });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async setLimit(req, res) {
    try {
      const { usuario_id, categoria_id, valor_limite, mes_ano } = req.body;
      if (!usuario_id || !categoria_id || !valor_limite || !mes_ano) {
        return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
      }

      const limit = await supabaseService.setLimit({ usuario_id, categoria_id, valor_limite, mes_ano });
      res.json({ success: true, data: limit });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteLimit(req, res) {
    try {
      const { id } = req.params;
      await supabaseService.deleteLimit(id);
      res.json({ success: true, message: 'Limite removido.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ApiController();
