const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'avaps_super_secure_jwt_token_secret_anganwadi_2026_x89';

/**
 * Express middleware: verifyAdminToken
 * Verifies Authorization: Bearer <token> on protected /api/admin/* endpoints.
 * Returns HTTP 403 Forbidden if token is missing, invalid, or expired.
 */
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(403).json({
      success: false,
      message: 'अनधिकृत पहुंच: टोकन अनुपलब्ध (Authorization token is required)',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(403).json({
      success: false,
      message:
        'अमान्य टोकन प्रारूप (Invalid authorization format. Bearer <token> required)',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'अमान्य या अनाधिकृत टोकन (Unauthorized admin token)',
      });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'टोकन की वैधता समाप्त या अमान्य है (Token is invalid or expired)',
    });
  }
};

module.exports = {
  verifyAdminToken,
  JWT_SECRET,
};
