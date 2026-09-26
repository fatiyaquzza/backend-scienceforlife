const express = require('express');
const router = express.Router();
const {
  getQuestionsBySubModule,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitAnswers
} = require('../controllers/questionController');
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Endpoint ini tetap publik supaya peserta yang sudah login bisa langsung
// memuat soal tanpa request tambahan, tapi optionalAuth tetap dipasang supaya
// controller tahu apakah pemanggil admin. Admin butuh correct_answer untuk
// mengisi form edit; sisanya tidak boleh pernah-column itu.
router.get('/submodule/:subModuleId/:type', optionalAuthMiddleware, getQuestionsBySubModule);
router.post('/', authMiddleware, adminMiddleware, createQuestion);
router.put('/:id', authMiddleware, adminMiddleware, updateQuestion);
router.delete('/:id', authMiddleware, adminMiddleware, deleteQuestion);
router.post('/submit', authMiddleware, submitAnswers);

module.exports = router;
