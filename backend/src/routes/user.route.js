import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, resetCurrentPassword, getCurrentUser, updateUserDetails, updateCoverImage, updateAvatarImage } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/register").post(
    upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
{
    name: "coverImage",
    maxCount: 1
}]),
    registerUser);

router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refreshToken").post(refreshAccessToken)
router.route("/passwordReset").post(verifyJWT, resetCurrentPassword)
router.route("/getUserDetails").get(verifyJWT, getCurrentUser)
router.route("/updateAccountDetails").post(verifyJWT, updateUserDetails)
router.route("/updateCoverImage").post(verifyJWT, upload.fields([
    {
    name: "coverImage",
    maxCount: 1
}]), updateCoverImage)
router.route("/updateAvatarImage").post(verifyJWT, upload.fields([{
    name: "avatarImage",
    maxCount: 1
}]), updateAvatarImage)


export default router