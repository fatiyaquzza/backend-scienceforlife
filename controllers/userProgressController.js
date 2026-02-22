const pool = require('../config/database');

const getProgressBySubModule = async (req, res) => {
  try {
    const { subModuleId } = req.params;
    const userId = req.user.id;

    const [progress] = await pool.execute(
      `SELECT up.*, sm.name as sub_module_name, sm.passing_grade
       FROM user_progress up
       JOIN sub_modules sm ON up.sub_module_id = sm.id
       WHERE up.user_id = ? AND up.sub_module_id = ?`,
      [userId, subModuleId]
    );

    if (progress.length === 0) {
      // Return default progress if not found
      const [subModules] = await pool.execute(
        'SELECT id, name, passing_grade FROM sub_modules WHERE id = ?',
        [subModuleId]
      );

      if (subModules.length === 0) {
        return res.status(404).json({ message: 'Sub module not found' });
      }

      return res.json({
        progress: {
          user_id: userId,
          sub_module_id: parseInt(subModuleId),
          pretest_done: false,
          pretest_score: 0,
          postest_done: false,
          postest_score: 0,
          is_passed: false,
          sub_module_name: subModules[0].name,
          passing_grade: subModules[0].passing_grade
        }
      });
    }

    res.json({ progress: progress[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllUserProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Users can only see their own progress, unless admin
    if (req.user.role !== 'admin' && parseInt(userId) !== requestingUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [progress] = await pool.execute(
      `SELECT up.*, 
       sm.name as sub_module_name, 
       sm.module_id,
       m.name as module_name,
       sm.passing_grade
       FROM user_progress up
       JOIN sub_modules sm ON up.sub_module_id = sm.id
       JOIN modules m ON sm.module_id = m.id
       WHERE up.user_id = ?
       ORDER BY up.last_accessed DESC`,
      [userId]
    );

    res.json({ progress });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getProgressBySubModule,
  getAllUserProgress
};
