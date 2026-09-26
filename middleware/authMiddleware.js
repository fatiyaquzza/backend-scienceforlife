const jwt = require('jsonwebtoken');

// Header Authorization hanya dibaca kalau skemanya persis "Bearer". Tanpa
// pemeriksaan ini `Basic <jwt>` atau `Foo <jwt>` ikut diterima, jadi token
// yang bukan bearer pun bisa dipakai untuk otorisasi.
const readBearerToken = (req) => {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;

  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;

  const token = rest.join(' ').trim();
  return token || null;
};

const authMiddleware = (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Untuk endpoint yang tetap publik tetapi perilakunya berbeda bila pemanggil
// adalah admin. Token tidak valid atau tidak ada TIDAK menjadi error di sini:
// request anonim tetap dilayani, hanya req.user yang dibiarkan undefined.
// Dipakai endpoint soal untuk menyembunyikan kunci jawaban dari-nonadmin
// tanpa memaksa seluruh peserta login.
const optionalAuthMiddleware = (req, res, next) => {
  const token = readBearerToken(req);

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = undefined;
    }
  }

  next();
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware };
