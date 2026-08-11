const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const webhookRoutes = require('./routes/webhookRoutes');
const apiRoutes = require('./routes/apiRoutes');
const viewRoutes = require('./routes/viewRoutes');

const app = express();

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'finzap_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Middlewares with increased payload limit for rich WhatsApp webhook data (base64/certs)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Views configuration (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Public static assets
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api', apiRoutes);
app.use('/', viewRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('index', { users: [], error: 'Página não encontrada.' });
});

module.exports = app;
