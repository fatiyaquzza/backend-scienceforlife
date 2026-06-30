const express = require('express');
const router = express.Router();
const {
  getAllFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  submitFeedback
} = require('../controllers/contactController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/feedback', authMiddleware, adminMiddleware, getAllFeedback);
router.patch('/feedback/:id/status', authMiddleware, adminMiddleware, updateFeedbackStatus);
router.delete('/feedback/:id', authMiddleware, adminMiddleware, deleteFeedback);
router.post('/feedback', submitFeedback);

module.exports = router;
