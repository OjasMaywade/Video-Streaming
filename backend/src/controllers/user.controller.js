import { asyncHandler } from "../utils/asycnHandler.js";
import {upload} from "../middlewares/multer.middleware.js";
import {ApiError} from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {User} from "../models/user.models.js"


const registerUser = asyncHandler( async(req,res)=>{
    let {username, password, email, fullName} = req.body;

    if([username, password, email, fullName].some((fields)=>{return  fields.trim() === ""})){                                                      // validation file can be maintained separately
        throw new ApiError(400, "Fields are required")
        }                 
    
   const userExist = await User.findOne({$or: [{username}, {email}]})

    if(userExist){
        throw new ApiError(400, "Username or email already exist")
    }

    let avatarFilePath = req.files?.avatar?.[0].path;    
    const coverFilePath = req.files?.coverImage?.[0].path;
    
    

    if(!avatarFilePath){
        throw new ApiError(400, "please upload the avatar Image");
    }

    const avatar = await uploadOnCloudinary(avatarFilePath);
    const coverImage = await uploadOnCloudinary(coverFilePath);

    if(!avatar){
        throw new ApiError(400, "Error in file Upload please try again")
    }

    const user = await User.create({
        username,
        password,
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const userCreated = await User.findById(user._id).select("-password -refreshToken");

    if(!userCreated){
        throw new ApiError(408, "Error occured while registering the user, Please try again")
    }

    return res.status(200).send(new ApiResponse(200, "User Successfully registered"))

})

export {registerUser}


/* 1. accept user information like in our model ex: username, password, fullname, avatar, email
2. upload on the db
3. check for error and pass it to user
4. if no error then send success message




*/