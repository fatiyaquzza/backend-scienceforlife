const express = require('express');
const router = express.Router();
const {
  getAllModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule
} = require('../controllers/moduleController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { uploadModuleImage } = require('../middleware/uploadMiddleware');

router.get('/', getAllModules);
router.get('/:id', getModuleById);
router.post('/', authMiddleware, adminMiddleware, uploadModuleImage, createModule);
router.put('/:id', authMiddleware, adminMiddleware, uploadModuleImage, updateModule);
router.delete('/:id', authMiddleware, adminMiddleware, deleteModule);

module.exports = router;
