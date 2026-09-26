const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadRoot = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

// Ensure upload directories exist
const uploadDirs = {
  modules: path.join(uploadRoot, 'modules'),
  materials: path.join(uploadRoot, 'materials'),
  images: path.join(uploadRoot, 'images'),
  team: path.join(uploadRoot, 'team'),
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

// Ekstensi dan MIME dikunci dengan pola yang DIANCUR, bukan `test()` tanpa
// anchor. `test()` tanpa anchor mencocokkan di mana saja dalam string, jadi
// `evil.png.exe` lolos cek ekstensi dan `application/pdf-evil` lolos cek MIME.
// File tetap aman karena X-Content-Type-Options: nosniff, tapi nama yang
// berakhiran `.exe` di direktori upload tidak pernah benar-benar diinginkan.
const IMAGE_EXTENSION = /^\.(jpe?g|png|gif|webp)$/i;
const PDF_EXTENSION = /^\.pdf$/i;

// Batas field non-file. Tanpa ini payload `interactions` yang besar ditolak
// sebagai error 500 (bukan 400) oleh default multer, karena limit field
// menghasilkan MulterError dengan kode LIMIT_FIELD_VALUE yang dulu tidak
// dipetakan di error handler.
const MULTIPART_LIMITS = {
  // 200 interaksi x sekitar 1 KB tiap satu sudah melebihi batas ini.
  fieldSize: 1024 * 1024,
  fields: 40,
  parts: 45,
};

// File filter for images
const imageFilter = (req, file, cb) => {
  const extname = IMAGE_EXTENSION.test(path.extname(file.originalname));
  const mimetype = /^image\/(jpe?g|png|gif|webp)$/i.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed!'));
};

// File filter for PDFs
const pdfFilter = (req, file, cb) => {
  const extname = PDF_EXTENSION.test(path.extname(file.originalname));
  const mimetype = file.mimetype === 'application/pdf';

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only PDF files are allowed!'));
};

const uploadModuleImage = multer({
  storage: moduleStorage,
  limits: { fileSize: 5 * 1024 * 1024, ...MULTIPART_LIMITS }, // 5MB
  fileFilter: imageFilter
});

const uploadMaterialFile = multer({
  storage: materialStorage,
  limits: { fileSize: 10 * 1024 * 1024, ...MULTIPART_LIMITS }, // 10MB
  fileFilter: pdfFilter
});

const contentImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.images);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'content-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const teamImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.team),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'team-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadTeamImageMulter = multer({
  storage: teamImageStorage,
  limits: { fileSize: 5 * 1024 * 1024, ...MULTIPART_LIMITS },
  fileFilter: imageFilter,
});

const uploadContentImageMulter = multer({
  storage: contentImageStorage,
  limits: { fileSize: 5 * 1024 * 1024, ...MULTIPART_LIMITS },
  fileFilter: imageFilter,
});

module.exports = {
  uploadModuleImage: uploadModuleImage.single('image'),
  uploadMaterialFile: uploadMaterialFile.single('file'),
  uploadContentImage: uploadContentImageMulter.single('image'),
  uploadTeamImage: uploadTeamImageMulter.single('photo'),
};
