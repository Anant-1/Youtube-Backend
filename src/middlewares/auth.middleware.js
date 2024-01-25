import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
export const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
        console.log("token: ", token);
        console.log("secret token env: ", process.env.ACCESS_TOKEN_SECRET);
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("decoded token: ", decodedToken);
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }
        req.user = user;

        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invaid access token");
    }
});
