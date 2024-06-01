import { asyncHandler } from "../utils/asycnHandler.js";
import {upload} from "../middlewares/multer.middleware.js";
import {ApiError} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js";
import {User} from "../models/user.models.js";
import jwt from "jsonwebtoken";
import {v2 as cloudinary}from "cloudinary";


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
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json( new ApiResponse(200,
        "User loggedout")
        )

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const {refreshToken} = req.cookies;

    if(!refreshToken) throw new ApiError(400, "token not provided")

    const decoderefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded)=>{
        if(err) throw new ApiError(400, "Token Invalid")
            else return decoded;
    })

    const user = await User.findById(decoderefreshToken._id)
    if(!user) throw new ApiError(400, "User ot available");

    if(refreshToken !== user.refreshToken) throw new ApiError(400, "RefreshToken doesn't match with the DB");

    const options={
        httpOnly: true,
        secure: true
    }
    const accessToken = user.generateAccessToken();
    console.log(accessToken)
    res
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {},
            "Access Token Re-geneareted"
        )
    )

})

const resetCurrentPassword = asyncHandler(async(req,res)=>{
    const {currentPassword, newPassword} = req.body;
    const user = req.user;
    
    if(!(currentPassword && newPassword)) throw new ApiError(400, "Please provide with Current/newPassword");

    const passwordValidation = await user.isPasswordCorrect(currentPassword);
    if(!passwordValidation) throw new ApiError(400, "Invalid current password");

    if(currentPassword === newPassword) throw new ApiError(400, "please use new password");

    user.password = newPassword;
    user.save();
    // const updated = await User.findByIdAndUpdate(user._id, newPassword);
    // console.log(updated)
    res.json(new ApiResponse(200, {},"Password Updated"));
    
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    const user = req.user;
    const userDetails = await User.findById(user._id).select("-password -refreshToken")
    res.json(new ApiResponse(200, {userDetails}, "User details fetch successfull"))
})

const updateUserDetails = asyncHandler(async(req,res)=>{
  const {fullName, email} = req.body;

  if(!(fullName || email)) throw new ApiError(400, "Please provide fullName/email to be updated");

  const user = await User.findById(req.user?._id);

  if(fullName) user.fullName = fullName;
  if(email) user.email = email;
  user.save();

  res.json(new ApiResponse(200, {}, "fullName/email updated"))

})

const updateAvatarImage = asyncHandler(async(req,res)=>{
    const avatarFilePath = req.files.avatarImage?.[0].path;
    const uploadIn = await uploadOnCloudinary(avatarFilePath);
    const user = await User.findByIdAndUpdate(req.user._id, {avatar: uploadIn.url}, {new: true}).select("-password -refreshToken");
    res.json(new ApiResponse(200, user, "Avatar Image successfully Uploaded"));
})

const updateCoverImage = asyncHandler(async(req,res)=>{
 try{
    const coverFilePath = req.files.coverImage?.[0].path;
 
 const deletePreviousImage = await deleteFromCloudinary(req.user.coverImage.split("/")[7].split(".")[0])
 console.log(deletePreviousImage)
 const cloudUpload = await uploadOnCloudinary(coverFilePath);
 const user = await User.findByIdAndUpdate(req.user._id, {coverImage: cloudUpload.url}, {new: true}).select("-password -refreshToken");
 res.json   (new ApiResponse(200, {user}, "Cover Image Uploaded Successfully"))
 }catch(err){
    throw new ApiError(400, err)
 }
})

export {registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    resetCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateCoverImage,
    updateAvatarImage
}




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

//Refresh Access token
/* 
1. Need to create a contoller and route to Generate new access token using refresh token after access token is expired
2. Here we will take refreshToken from user verify it using jwt.verify
3. Next we will verify the token stored in the db
4. generate new access token 
5. send response to user
*/

//Change Current password
/* 
1. User need to be authorized before accessing this route
2. next user needs to provide the current password and new password
3. we need to check the current password is same as what is stored in db
4. also the current and new password should not be same 
5. after all verification we can save the new password in db and logout user and ask him to login with new password
*/ 


//UpdateCoverImage
/* 
1. we have delete cloudinary previous image before updating the coverimage. the choice we have is:
i) save the public_id in db
ii) extract the public_id from image url
iii)
*/