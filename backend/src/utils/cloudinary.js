import {v2 as cloudinary}from "cloudinary";
import fs from "fs";
import { ApiError } from "../utils/ApiError.js";

          
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

const deleteFromCloudinary = async(publicId) =>{
  if(!publicId) throw new ApiError(400, "file publicId not provided/empty");
  const response = await cloudinary.uploader.destroy(publicId, (err, result)=>{
    if (err) throw new ApiError(400, `FIle not deleted: ${err}`);
    return result;
  })
  return response;
}

const uploadOnCloudinary = async (filePath)=>{
  try {
    if(!filePath) return null;
    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto"
    });
    console.log("File has been uploaded on cloudinary: ", response.url)
    fs.unlinkSync(filePath)
      return response;
  } catch (error) {
    fs.unlinkSync(filePath)
    console.log(error)
  }
}



export {uploadOnCloudinary, deleteFromCloudinary}

