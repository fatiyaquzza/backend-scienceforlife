const express = require('express');
const router = express.Router();
const {
  getQuestionsBySubModule,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitAnswers
} = require('../controllers/questionController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/submodule/:subModuleId/:type', getQuestionsBySubModule);
router.post('/', authMiddleware, adminMiddleware, createQuestion);
router.put('/:id', authMiddleware, adminMiddleware, updateQuestion);
router.delete('/:id', authMiddleware, adminMiddleware, deleteQuestion);
router.post('/submit', authMiddleware, submitAnswers);

module.exports = router;
