const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Users
router.get('/users', (req, res) => apiController.getUsers(req, res));
router.post('/users', (req, res) => apiController.createUser(req, res));
router.put('/users/:id', (req, res) => apiController.updateUser(req, res));
router.delete('/users/:id', (req, res) => apiController.deleteUser(req, res));

// Categories
router.get('/categories', (req, res) => apiController.getCategories(req, res));
router.post('/categories', (req, res) => apiController.createCategory(req, res));
router.delete('/categories/:id', (req, res) => apiController.deleteCategory(req, res));

// Transactions
router.get('/transactions', (req, res) => apiController.getTransactions(req, res));
router.post('/transactions', (req, res) => apiController.createTransaction(req, res));
router.delete('/transactions/:id', (req, res) => apiController.deleteTransaction(req, res));

// Summary & Limits
router.get('/summary', (req, res) => apiController.getSummary(req, res));
router.post('/limits', (req, res) => apiController.setLimit(req, res));
router.delete('/limits/:id', (req, res) => apiController.deleteLimit(req, res));

module.exports = router;
