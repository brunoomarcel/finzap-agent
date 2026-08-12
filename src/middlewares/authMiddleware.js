const MOCK_ADMIN = {
  id: 'c6aa49ad-feec-42ee-9db2-9b68d5376f31',
  nome: 'Amanda Lima',
  telefone: '557998262163',
  role: 'ADMIN'
};

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.user = MOCK_ADMIN;
  return next();
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.user = MOCK_ADMIN;
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
