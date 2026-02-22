const pool = require('../config/database');

const getAllModules = async (req, res) => {
  try {
    const [modules] = await pool.execute(
      `SELECT m.*, 
       COUNT(DISTINCT sm.id) as sub_module_count
       FROM modules m
       LEFT JOIN sub_modules sm ON m.id = sm.module_id
       GROUP BY m.id
       ORDER BY m.created_at DESC`
    );

    res.json({ modules });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getModuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const [modules] = await pool.execute(
      'SELECT * FROM modules WHERE id = ?',
      [id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ message: 'Module not found' });
    }

    res.json({ module: modules[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createModule = async (req, res) => {
  try {
    const { name, description } = req.body;
    const imageUrl = req.file ? `/uploads/modules/${req.file.filename}` : null;

    if (!name) {
      return res.status(400).json({ message: 'Module name is required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO modules (name, description, image_url) VALUES (?, ?, ?)',
      [name, description || null, imageUrl]
    );

    const [newModule] = await pool.execute(
      'SELECT * FROM modules WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Module created successfully',
      module: newModule[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if module exists
    const [modules] = await pool.execute(
      'SELECT * FROM modules WHERE id = ?',
      [id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ message: 'Module not found' });
    }

    let imageUrl = modules[0].image_url;
    if (req.file) {
      imageUrl = `/uploads/modules/${req.file.filename}`;
    }

    await pool.execute(
      'UPDATE modules SET name = ?, description = ?, image_url = ? WHERE id = ?',
      [name || modules[0].name, description !== undefined ? description : modules[0].description, imageUrl, id]
    );

    const [updatedModule] = await pool.execute(
      'SELECT * FROM modules WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Module updated successfully',
      module: updatedModule[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if module exists
    const [modules] = await pool.execute(
      'SELECT * FROM modules WHERE id = ?',
      [id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ message: 'Module not found' });
    }

    await pool.execute('DELETE FROM modules WHERE id = ?', [id]);

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule
};
