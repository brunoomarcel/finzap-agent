const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// Dashboard Main View
router.get('/', async (req, res) => {
  try {
    const users = await supabaseService.listUsers();
    res.render('index', { users });
  } catch (err) {
    res.render('index', { users: [], error: err.message });
  }
});

// Users Management View
router.get('/usuarios', async (req, res) => {
  try {
    const users = await supabaseService.listUsers();
    res.render('usuarios', { users });
  } catch (err) {
    res.render('usuarios', { users: [], error: err.message });
  }
});

module.exports = router;
