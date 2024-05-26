import { asyncHandler } from "../utils/asycnHandler.js";
import {upload} from "../middlewares/multer.middleware.js";
import {ApiError} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {User} from "../models/user.models.js";
import jwt from "jsonwebtoken";


const generateAccessTokenAndRefreshToken = async(userinfo)=>{
     const accessToken = userinfo.generateAccessToken();
     const refreshToken = userinfo.generateRefreshToken();

     userinfo.refreshToken = refreshToken;
     userinfo.save();

     return {accessToken, refreshToken};
}

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

const loginUser = asyncHandler(async(req,res)=>{
 const {username, password} = req.body;
 //console.log(username)

 if(!(username && password)) throw new ApiError(400, "username/Email and Password Required");

 const user = await User.findOne({username});

 if(!user) throw new ApiError(400, `User with ${username} doesn't exist, Please try again`);

 const validPassword = await user.isPasswordCorrect(password)

 if(!validPassword) throw new ApiError(401, "Incorrect Credentials please check the password");

 const {accessToken, refreshToken}= await generateAccessTokenAndRefreshToken(user);

 const loggedIn = await User.findById(user._id).select("-password -refreshToken");
 
 const options = {
  httpOnly: true,
  secure: true
 }

 res
 .status(200)
 .cookie("accessToken", accessToken, options)
 .cookie("refreshToken", refreshToken, options)
 .json(
    new ApiResponse( 200,
        {loggedIn},
        "User loggedin Successfully"
    )
 )

})

const logoutUser = asyncHandler(async(req,res)=>{
  const {accessToken, refreshToken} = req.cookies || req.headers;
    const userinfo= req.user;

    await User.findByIdAndUpdate(userinfo._id, {refreshToken: ""})

    const options= {
        httpOnly: true,
        secure: true
    }
    res
    .clearCookie("accessToken", accessToken, options)
    .clearCookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(200,
        "User loggedout")
         )

})

export {registerUser, loginUser, logoutUser}




// Regiser User
/* 1. accept user information like in our model ex: username, password, fullname, avatar, email
2. upload on the db
3. check for error and pass it to user
4. if no error then send success message
*/

//Login User
/*
1. user will send username and password in body
2. Check if the info is send else throw error
3. check in db for the user availability else throw error
4. after getting the User details from db generate Access and refresh token 
5. send this token through cookies back to user with message user logged-in 

*/

//Logout User
/* 
1. For loggin out a user we need to first verify the user that it has authorization to logout
2. For logging out a user we need to delete the cookies, Access and refresh token from db
*/