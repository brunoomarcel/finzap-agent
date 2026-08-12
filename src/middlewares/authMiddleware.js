function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user) {
    const role = (req.session.user.role || '').toUpperCase();
    if (role === 'ADMIN') {
      return next();
    }
    return res.status(403).render('error', {
      user: req.session.user,
      error: 'Acesso restrito. Apenas administradores têm permissão para acessar o painel de administração.'
    });
  }
  return res.redirect('/login');
}

module.exports = {
  requireAuth,
  requireAdmin
};
