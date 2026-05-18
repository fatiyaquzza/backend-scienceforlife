const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
} = require("../utils/tokenService");

const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  job: user.job,
  address: user.address,
  role: user.role,
});

const register = async (req, res) => {
  try {
    const { name, email, password, job, address } = req.body;

    if (!name || !email || !password || !job || !address) {
      return res.status(400).json({
        message:
          "All fields are required (name, email, password, job, address)",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password, job, address) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, job, address],
    );

    const user = {
      id: result.insertId,
      name,
      email,
      job,
      address,
      role: "user",
    };

    const tokens = await issueTokenPair(user);

    res.status(201).json({
      message: "User registered successfully",
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const tokens = await issueTokenPair(user);

    res.json({
      message: "Login successful",
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const tokens = await rotateRefreshToken(refreshToken);

    if (!tokens) {
      return res.status(401).json({
        message: "Sesi tidak valid atau sudah berakhir. Silakan login kembali.",
        code: "REFRESH_INVALID",
      });
    }

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await revokeRefreshToken(refreshToken);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, role, job, address, created_at FROM users WHERE id = ?",
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { register, login, refresh, logout, getMe };
