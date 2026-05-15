const express = require("express");
const router = express.Router();
const { uploadContentImage } = require("../controllers/uploadController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const { uploadContentImage: uploadMiddleware } = require("../middleware/uploadMiddleware");

router.post(
  "/upload-image",
  authMiddleware,
  adminMiddleware,
  uploadMiddleware,
  uploadContentImage
);

module.exports = router;
