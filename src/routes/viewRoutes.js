const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

// Login View
router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

// Register View
router.get('/register', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/');
  }
  res.render('register', { error: null });
});

// Process Register
router.post('/register', async (req, res) => {
  try {
    const { nome, telefone, senha } = req.body;
    if (!nome || !telefone || !senha) {
      return res.render('register', { error: 'Preencha todos os campos.' });
    }

    const newUser = await supabaseService.createUser({
      nome,
      telefone,
      senha,
      role: 'USER',
      ativo: true
    });

    req.session.user = {
      id: newUser.id,
      nome: newUser.nome,
      telefone: newUser.telefone,
      role: newUser.role || 'USER'
    };

    return res.redirect('/');
  } catch (err) {
    res.render('register', { error: err.message });
  }
});

// Process Login
router.post('/login', async (req, res) => {
  try {
    const { telefone, senha } = req.body;
    if (!telefone || !senha) {
      return res.render('login', { error: 'Informe telefone e senha.' });
    }

    const authResult = await supabaseService.authenticateUser(telefone, senha);
    if (!authResult.success) {
      return res.render('login', { error: authResult.message });
    }

    req.session.user = {
      id: authResult.user.id,
      nome: authResult.user.nome,
      telefone: authResult.user.telefone,
      role: authResult.user.role || 'USER'
    };

    if (req.session.user.role === 'ADMIN') {
      return res.redirect('/admin');
    }
    return res.redirect('/');
  } catch (err) {
    res.render('login', { error: 'Erro ao processar login: ' + err.message });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Standard User Dashboard (Own Data Only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const currentUser = req.session.user;
    res.render('index', { user: currentUser });
  } catch (err) {
    res.render('index', { user: req.session.user, error: err.message });
  }
});

// Admin Panel (All Users & Management)
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const users = await supabaseService.listUsers();
    res.render('admin', { user: req.session.user, users });
  } catch (err) {
    res.render('admin', { user: req.session.user, users: [], error: err.message });
  }
});

// Legacy /usuarios route redirects to /admin
router.get('/usuarios', requireAdmin, (req, res) => {
  res.redirect('/admin');
});

module.exports = router;
