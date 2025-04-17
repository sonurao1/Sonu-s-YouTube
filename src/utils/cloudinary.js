import { v2 as cloudinary } from "cloudinary"; // Importing Cloudinary v2 and renaming it as 'cloudinary'
import fs from "fs"; // Importing Node's File System module to work with local files
import dotenv from 'dotenv'

dotenv.config({
    path: "./.env"
})

// Configuring Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY,       // Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Cloudinary API secret
});



// Function to upload a file to Cloudinary
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null; // If no file path is provided, return null

    // here i am getting the value from .env
    console.log("Cloudinary Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);   
    console.log("Cloudinary API Key:", process.env.CLOUDINARY_API_KEY);
    console.log("Cloudinary API Secret:", process.env.CLOUDINARY_API_SECRET);

    // Uploading the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Let Cloudinary detect the file type (image, video, etc.)
    });

    // If upload is successful, log the URL and return the response
    console.log("File uploaded successfully on Cloudinary:", response.url);
    fs.unlinkSync(localFilePath)
    return response;
  } catch (error) {
    console.log(error)
    // If upload fails, delete the local file (if it exists) to clean up
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Delete the local temporary file
    }
    return null; // Return null to indicate failure
  }
};


import cloudinary from 'cloudinary';



const deleteFileFromCloudinary = async (publicId) => {
  try {
    // Destroy the file from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(result); // Will log the result of the deletion
    return result;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Error deleting file from Cloudinary');
  }
};



// Exporting the upload function so it can be used in other files
export { 
  uploadOnCloudinary ,
  deleteFileFromCloudinary
};
