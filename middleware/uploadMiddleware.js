const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = {
  modules: 'uploads/modules',
  materials: 'uploads/materials'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for module images
const moduleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.modules);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'module-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for material PDFs
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.materials);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// File filter for PDFs
const pdfFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'));
  }
};

const uploadModuleImage = multer({
  storage: moduleStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
});

const uploadMaterialFile = multer({
  storage: materialStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: pdfFilter
});

module.exports = {
  uploadModuleImage: uploadModuleImage.single('image'),
  uploadMaterialFile: uploadMaterialFile.single('file')
};
