const express = require('express');
const router = express.Router();
const {
  getMaterialsBySubModule,
  createMaterial,
  updateMaterial,
  deleteMaterial
} = require('../controllers/materialController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { uploadMaterialFile } = require('../middleware/uploadMiddleware');

router.get('/submodule/:subModuleId', getMaterialsBySubModule);
router.post('/', authMiddleware, adminMiddleware, uploadMaterialFile, createMaterial);
router.put('/:id', authMiddleware, adminMiddleware, uploadMaterialFile, updateMaterial);
router.delete('/:id', authMiddleware, adminMiddleware, deleteMaterial);

module.exports = router;
