import multer from "multer";
import path from "path";
import fs from "fs";

// Use /tmp for serverless environments
const uploadDir = process.env.NODE_ENV === 'production' ? "/tmp" : "./public/temp";

try {
  // Check if directory exists before creating
  if (!fs.existsSync(uploadDir)) {
    // Create parent directories recursively
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.error("Failed to create upload directory:", error);
  // Fall back to /tmp if other paths fail
  uploadDir = "/tmp";
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});