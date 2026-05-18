const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";
const REFRESH_DAYS = parseInt(process.env.JWT_REFRESH_DAYS || "7", 10);

const parseDurationMs = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim();
  const match = /^(\d+)([smhd])$/i.exec(s);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (multipliers[unit] || 86_400_000);
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const signAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES },
  );

const generateRefreshToken = () => crypto.randomBytes(40).toString("hex");

const storeRefreshToken = async (userId, refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationMs(REFRESH_EXPIRES));

  await pool.execute(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt],
  );

  return expiresAt;
};

const issueTokenPair = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt,
  };
};

const findValidRefreshRecord = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  const [rows] = await pool.execute(
    `SELECT rt.id, rt.user_id, rt.expires_at, u.email, u.role
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ?`,
    [tokenHash],
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) {
    await pool.execute("DELETE FROM refresh_tokens WHERE id = ?", [row.id]);
    return null;
  }

  return row;
};

const rotateRefreshToken = async (oldRefreshToken) => {
  const record = await findValidRefreshRecord(oldRefreshToken);
  if (!record) return null;

  await pool.execute("DELETE FROM refresh_tokens WHERE id = ?", [record.id]);

  const user = {
    id: record.user_id,
    email: record.email,
    role: record.role,
  };

  return issueTokenPair(user);
};

const revokeRefreshToken = async (refreshToken) => {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await pool.execute("DELETE FROM refresh_tokens WHERE token_hash = ?", [
    tokenHash,
  ]);
};

const revokeAllForUser = async (userId) => {
  await pool.execute("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]);
};

const cleanupExpiredRefreshTokens = async () => {
  try {
    await pool.execute(
      "DELETE FROM refresh_tokens WHERE expires_at < NOW()",
    );
  } catch {
    /* table may not exist yet */
  }
};

module.exports = {
  ACCESS_EXPIRES,
  REFRESH_DAYS,
  signAccessToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  cleanupExpiredRefreshTokens,
};
