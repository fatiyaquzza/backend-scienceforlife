const pool = require('../config/database');

const isMissingFeedbackStatusColumns = (error) =>
  error?.code === "ER_BAD_FIELD_ERROR" &&
  (error.message?.includes("status") || error.message?.includes("resolved_at"));

const mapFeedbackStatusFallback = (rows) =>
  rows.map((row) => ({
    ...row,
    status: "open",
    resolved_at: null,
  }));

// Get all contact feedback (admin only)
const getAllFeedback = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         id,
         name,
         email,
         subject,
         message,
         COALESCE(status, 'open') AS status,
         resolved_at,
         created_at
       FROM contact_feedback
       ORDER BY created_at DESC`
    );
    res.json({ feedback: rows });
  } catch (error) {
    if (isMissingFeedbackStatusColumns(error)) {
      try {
        const [rows] = await pool.execute(
          'SELECT id, name, email, subject, message, created_at FROM contact_feedback ORDER BY created_at DESC'
        );
        return res.json({ feedback: mapFeedbackStatusFallback(rows) });
      } catch {
        return res.status(500).json({
          success: false,
          message: 'Gagal mengambil data pesan.',
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pesan.',
    });
  }
};

// Update contact feedback status (admin only)
const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "done"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status pesan tidak valid.",
      });
    }

    const [feedback] = await pool.execute(
      "SELECT id FROM contact_feedback WHERE id = ?",
      [id]
    );

    if (feedback.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pesan tidak ditemukan.",
      });
    }

    await pool.execute(
      "UPDATE contact_feedback SET status = ?, resolved_at = ? WHERE id = ?",
      [status, status === "done" ? new Date() : null, id]
    );

    const [updatedFeedback] = await pool.execute(
      `SELECT
         id,
         name,
         email,
         subject,
         message,
         COALESCE(status, 'open') AS status,
         resolved_at,
         created_at
       FROM contact_feedback
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Status pesan berhasil diperbarui.",
      feedback: updatedFeedback[0],
    });
  } catch (error) {
    if (isMissingFeedbackStatusColumns(error)) {
      return res.status(400).json({
        success: false,
        message: "Fitur status pesan belum aktif. Jalankan migration 003_contact_feedback_status.sql terlebih dahulu.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Gagal memperbarui status pesan.",
    });
  }
};

// Delete contact feedback (admin only)
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM contact_feedback WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Pesan tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      message: "Pesan berhasil dihapus.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pesan.",
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

module.exports = {
  getAllFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  submitFeedback,
};
