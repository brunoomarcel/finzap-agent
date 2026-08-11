function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'ADMIN') {
      return next();
    }
    return res.status(403).render('error', {
      user: req.session.user,
      error: 'Acesso negado. Esta página requer privilégios de Administrador.'
    });
  }
  return res.redirect('/login');
}

module.exports = {
  requireAuth,
  requireAdmin
};
