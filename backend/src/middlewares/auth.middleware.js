import jwt from "jsonwebtoken";
import {asyncHandler} from "../utils/asycnHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js"

export const verifyJWT = asyncHandler(async(req,_, next)=>{
 const token =  req.cookies?.accessToken || req.headers.authorization.accessToken ;

 if(!token){
    throw new ApiError(400, "unAuthorized Request")
 }

 const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode)=>{
    if(err) throw new ApiError(400, "Token invalid");
    else return decode;
 })

  const user = await User.findById(decodeToken._id);

  if(!user) throw new ApiError(404, "User not available in DB, please signup");
  
  req.user = user;
  next();

})


// from cookie get access token
// check for did we get the token else throw error
// use jwt.verify to verify the access token, this will give us the payload
// use the payload and find the user from its ID in db
// if use not found then throw error else return the value
// call next as this willl be used as middleware on the uthenticated routes
// export the middleware
