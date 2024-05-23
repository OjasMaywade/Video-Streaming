import mongoose, {Schema} from "mongoose";
import { Video } from "./video.models.js";
import bcrypt from "bcrypt";
import jwt from "json-web-token";

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        require: true,
        unique: true,
        trim: true,
        index: true
    },
    fullName:{
        type: String,
        require: true,
        trim: true
    },
    email:{
        type: String,
        require: true,
        lowercase: true,
        unique: true,
        trim: true
    },
    password:{
        type: String,
        require: true,
    },
    avatar: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
        required: false
    },
    watchHistory:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: Video
    }],
    refreshToken:{
        
    }
}, {timestamps: true})

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
  this.password = bcrypt.hash(this.password, 10);
  next();
})

userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
   return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email,
        fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expireIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
    _id: this._id,
},
process.env.REFRESH_TOKEN_SECRET,
{
    expireIn: process.env.REFRESH_TOKEN_EXPIRY,
}
    )
}


export const User = mongoose.model("User", userSchema);