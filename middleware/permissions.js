// middleware/permissions.js
/**
 * requireRole(role)
 * Middleware factory to guard routes by user role.
 * Expects req.user.roles to be an array of strings.
 */
function requireRole(role) {
  return function (req, res, next) {
    const user = req.user;
    if (!user || !Array.isArray(user.roles)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!user.roles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireRole };
