const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Evolution API Go webhook endpoint
router.post('/evolution', (req, res) => webhookController.handleEvolutionWebhook(req, res));
router.post('/', (req, res) => webhookController.handleEvolutionWebhook(req, res));

module.exports = router;
