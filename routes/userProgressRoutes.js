const express = require('express');
const router = express.Router();
const {
  getProgressBySubModule,
  getAllUserProgress
} = require('../controllers/userProgressController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/submodule/:subModuleId', authMiddleware, getProgressBySubModule);
router.get('/user/:userId', authMiddleware, getAllUserProgress);

module.exports = router;
