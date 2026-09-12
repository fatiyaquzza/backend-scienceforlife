const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { uploadTeamImage } = require('../middleware/uploadMiddleware');
const {
  getTeam,
  createCategory,
  updateCategory,
  deleteCategory,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/teamController');

router.get('/', getTeam);
router.get('/admin', authMiddleware, adminMiddleware, getTeam);
router.post('/categories', authMiddleware, adminMiddleware, createCategory);
router.put('/categories/:id', authMiddleware, adminMiddleware, updateCategory);
router.delete('/categories/:id', authMiddleware, adminMiddleware, deleteCategory);
router.post('/members', authMiddleware, adminMiddleware, uploadTeamImage, createMember);
router.put('/members/:id', authMiddleware, adminMiddleware, uploadTeamImage, updateMember);
router.delete('/members/:id', authMiddleware, adminMiddleware, deleteMember);

module.exports = router;
