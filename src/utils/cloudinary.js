import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload file to cloudinary
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // Upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // File has been uploaded successfully
    console.log("File uploaded on cloudinary", response.url);
    // Remove the locally saved temporary file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return response;
  } catch (error) {
    console.error("Error uploading to cloudinary:", error);
    // Remove the locally saved temporary file as the upload operation failed
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

// Function to upload buffer to cloudinary (for serverless environments)
export const uploadBufferToCloudinary = async (buffer, folder = "uploads") => {
  try {
    if (!buffer) return null;

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder,
        resource_type: "auto"
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error("Error in upload stream:", error);
            reject(error);
          } else {
            console.log("Buffer uploaded to cloudinary:", result.url);
            resolve(result);
          }
        }
      );

      // Write buffer to stream
      uploadStream.write(buffer);
      uploadStream.end();
    });
  } catch (error) {
    console.error("Error uploading buffer to cloudinary:", error);
    return null;
  }
};

// Function to delete file from cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("File deleted from cloudinary", result);
    return result;
  } catch (error) {
    console.error("Error deleting from cloudinary:", error);
    return null;
  }
};

// Function to extract public ID from a cloudinary URL
export const extractPublicId = (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl) return null;
    
    // Extract the public ID from the URL
    // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
    const urlParts = cloudinaryUrl.split('/');
    const filenameWithExtension = urlParts[urlParts.length - 1];
    const publicIdWithVersion = urlParts.slice(-2).join('/');
    
    // Remove version and file extension
    const publicId = publicIdWithVersion.split('.')[0];
    
    return publicId;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};