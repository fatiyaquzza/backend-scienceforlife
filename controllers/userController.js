const bcrypt = require("bcryptjs");
const pool = require("../config/database");

const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT 
         id, 
         name, 
         email, 
         role, 
         job,
         address,
         created_at,
         (SELECT COUNT(*) 
          FROM user_progress 
          WHERE user_id = users.id) AS total_progress,
         (
           SELECT AVG(pretest_score)
           FROM user_progress
           WHERE user_id = users.id 
             AND pretest_done = 1
         ) AS avg_pretest_score,
         (
           SELECT AVG(postest_score)
           FROM user_progress
           WHERE user_id = users.id 
             AND postest_done = 1
         ) AS avg_posttest_score
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      "SELECT id, name, email, role, job, address, created_at FROM users WHERE id = ?",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, job, address } = req.body;

    // Check if user exists
    const [users] = await pool.execute("SELECT * FROM users WHERE id = ?", [
      id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }

    if (email) {
      // Check if email already exists for another user
      const [existingUsers] = await pool.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }

      updateFields.push("email = ?");
      updateValues.push(email);
    }

    if (role && ["admin", "user"].includes(role)) {
      updateFields.push("role = ?");
      updateValues.push(role);
    }

    if (job !== undefined) {
      updateFields.push("job = ?");
      updateValues.push(job);
    }

    if (address !== undefined) {
      updateFields.push("address = ?");
      updateValues.push(address);
    }

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push("password = ?");
      updateValues.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateValues.push(id);

    await pool.execute(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const [updatedUser] = await pool.execute(
      "SELECT id, name, email, role, job, address, created_at FROM users WHERE id = ?",
      [id]
    );

    res.json({
      message: "User updated successfully",
      user: updatedUser[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    // Check if user exists
    const [users] = await pool.execute("SELECT id FROM users WHERE id = ?", [
      id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
