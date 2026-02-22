const express = require('express');
const router = express.Router();
const {
  getSubModulesByModule,
  getSubModuleById,
  createSubModule,
  updateSubModule,
  deleteSubModule
} = require('../controllers/subModuleController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/module/:moduleId', getSubModulesByModule);
router.get('/:id', getSubModuleById);
router.post('/', authMiddleware, adminMiddleware, createSubModule);
router.put('/:id', authMiddleware, adminMiddleware, updateSubModule);
router.delete('/:id', authMiddleware, adminMiddleware, deleteSubModule);

module.exports = router;
