const pool = require('../config/database');

// Get all contact feedback (admin only)
const getAllFeedback = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, subject, message, created_at FROM contact_feedback ORDER BY created_at DESC'
    );
    res.json({ feedback: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pesan.',
    });
  }
};

// Submit contact/feedback form
const submitFeedback = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan pesan wajib diisi',
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO contact_feedback (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), subject?.trim() || null, message.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Terima kasih! Pesan Anda telah berhasil dikirim. Kami akan segera merespons.',
      id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengirim pesan. Silakan coba lagi.',
    });
  }
};

module.exports = { getAllFeedback, submitFeedback };
