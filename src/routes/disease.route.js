import { Router } from "express";
import { createCrop } from "../controllers/disease.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All crop routes require authentication
router.use(verifyJWT);

// Route for creating a new crop with image upload
router.post(
  "/create", 
  upload.single("image"), 
  createCrop
);

export default router;