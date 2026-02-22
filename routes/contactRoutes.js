const express = require('express');
const router = express.Router();
const { getAllFeedback, submitFeedback } = require('../controllers/contactController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/feedback', authMiddleware, adminMiddleware, getAllFeedback);
router.post('/feedback', submitFeedback);

module.exports = router;
