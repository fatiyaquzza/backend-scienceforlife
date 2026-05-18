const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
        code: "NO_TOKEN",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    const isExpired = error.name === "TokenExpiredError";
    return res.status(401).json({
      message: isExpired
        ? "Sesi telah berakhir"
        : "Invalid or expired token",
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
