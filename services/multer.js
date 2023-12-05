const multer = require('multer');

const storage = destinationFolder =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationFolder);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

const upload = (destinationFolder = 'uploads/') =>
  multer({
    storage: storage(destinationFolder),
    limits: { fileSize: 16 * 1204 * 1024 }, // 16 mega bytes maximum file size
  });

module.exports = { upload };
