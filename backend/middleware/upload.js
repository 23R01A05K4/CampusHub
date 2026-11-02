const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Uploads live outside the source tree so committed files are never served by accident.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    cb(null, Date.now() + "-" + safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPEG, PNG, WebP or GIF images up to 2 MB are allowed"));
  }
});

module.exports = upload;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
