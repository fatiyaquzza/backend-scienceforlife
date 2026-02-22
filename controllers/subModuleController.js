const pool = require('../config/database');

const getSubModulesByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const [subModules] = await pool.execute(
      `SELECT sm.*, 
       COUNT(DISTINCT m.id) as material_count
       FROM sub_modules sm
       LEFT JOIN materials m ON sm.id = m.sub_module_id
       WHERE sm.module_id = ?
       GROUP BY sm.id
       ORDER BY sm.created_at ASC`,
      [moduleId]
    );

    res.json({ subModules });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getSubModuleById = async (req, res) => {
  try {
    const { id } = req.params;

    const [subModules] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ message: 'Sub module not found' });
    }

    res.json({ subModule: subModules[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createSubModule = async (req, res) => {
  try {
    const { module_id, name, description, passing_grade } = req.body;

    if (!module_id || !name) {
      return res.status(400).json({ message: 'Module ID and name are required' });
    }

    // Check if module exists
    const [modules] = await pool.execute(
      'SELECT id FROM modules WHERE id = ?',
      [module_id]
    );

    if (modules.length === 0) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const [result] = await pool.execute(
      'INSERT INTO sub_modules (module_id, name, description, passing_grade) VALUES (?, ?, ?, ?)',
      [module_id, name, description || null, passing_grade || 70]
    );

    const [newSubModule] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Sub module created successfully',
      subModule: newSubModule[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateSubModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, passing_grade } = req.body;

    // Check if sub module exists
    const [subModules] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ message: 'Sub module not found' });
    }

    await pool.execute(
      'UPDATE sub_modules SET name = ?, description = ?, passing_grade = ? WHERE id = ?',
      [
        name || subModules[0].name,
        description !== undefined ? description : subModules[0].description,
        passing_grade !== undefined ? passing_grade : subModules[0].passing_grade,
        id
      ]
    );

    const [updatedSubModule] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Sub module updated successfully',
      subModule: updatedSubModule[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteSubModule = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if sub module exists
    const [subModules] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [id]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ message: 'Sub module not found' });
    }

    await pool.execute('DELETE FROM sub_modules WHERE id = ?', [id]);

    res.json({ message: 'Sub module deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getSubModulesByModule,
  getSubModuleById,
  createSubModule,
  updateSubModule,
  deleteSubModule
};
