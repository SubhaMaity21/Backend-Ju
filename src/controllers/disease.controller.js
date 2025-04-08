import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Disease } from "../models/disease.model.js";
import fs from "fs";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { OpenAI } from "openai";

const client = new OpenAI({
	baseURL: "https://router.huggingface.co/novita/v3/openai",
	apiKey: "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",
});

const createCrop = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    // Remove uploaded file if validation fails
    if (req.file?.path) {
      fs.unlinkSync(req.file?.path);
    }
    throw new ApiError(400, "Name and description are required");
  }

  const imageLocalPath = req.file?.path;
  if (!imageLocalPath) {
    throw new ApiError(400, "Crop image is required");
  }

  const cropImage = await uploadOnCloudinary(imageLocalPath);
  if (!cropImage) {
    throw new ApiError(500, "Failed to upload image to cloudinary");
  }

  // Delete local file after upload
  try {
    if (fs.existsSync(imageLocalPath)) {
      fs.unlinkSync(imageLocalPath);
    }
  } catch (error) {
    console.error("Error deleting local file:", error);
  
  }

  // Pass the correct image URL to the LLM
  const chatCompletion = await client.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "identify the disease, your response should be one word, and if the image does not contain any plant send a error" },
          { type: "image_url", image_url: { url: cropImage.url } },
        ],
      },
    ],
    max_tokens: 500,
  });

  const responseText = chatCompletion.choices[0].message.content;

  // Create crop entry in database
  const crop = await Disease.create({
    name,
    
    diseaseIdentified: responseText,
    image: cropImage.url,
  });

  // Send only one response
  return res
    .status(201)
    .json(new ApiResponse(201, { crop, aiResponse: responseText }, "Crop created successfully"));
});


export { createCrop };