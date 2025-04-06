import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Disease } from "../models/disease.model.js";
import fs from "fs";
import {uploadOnCloudinary,deleteFromCloudinary,extractPublicId} from "../utils/cloudinary.js"
const createCrop = asyncHandler(async (req, res) => {
  // Check if image was uploaded via multer
//   if (!req.file) {
//     throw new ApiError(400, "Crop image is required");
//   }

  const { name, description,  } = req.body;

  if (!name || !description) {
    // Remove uploaded file if validation fails
    // fs.unlinkSync(req.file.path);
    throw new ApiError(400, "Name and description are required");
  }

  const imageLocalPath = req.file?.path;
  if (!imageLocalPath) {
    throw new  ApiError(400, "Crop image is required");
  }

  const cropImage = await uploadOnCloudinary(imageLocalPath);
    if (!cropImage) {
        throw new ApiError(500, "Failed to upload image to cloudinary");
    }
  // Create crop entry in database
  const crop = await Disease.create({
    name,
    description,
    image:cropImage?.url  ,
   
  });

  return res
    .status(201)
    .json(new ApiResponse(201, crop, "Crop created successfully"));
});



export { createCrop };