const express = require('express');
const multer = require('multer');
const { uploadDocument, listDocuments, deleteDocument } = require('../controllers/document.controller');

const router = express.Router();

// Multer: memory storage, PDF only, max 50 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted.'));
    }
  },
});

router.post('/upload', upload.single('pdf'), uploadDocument);
router.get('/', listDocuments);
router.delete('/:id', deleteDocument);

module.exports = router;
