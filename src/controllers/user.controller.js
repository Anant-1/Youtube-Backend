import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    console.log(fullName, email, username, password);
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All Fields is required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    // console.log("existed user: ", existedUser);
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    console.log("request files: ", req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path

    // let coverImageLocalPath;
    // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path;

    // }
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    // if(coverImageLocalPath == undefined) {
    //     coverImageLocalPath = null;
    // }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log('avatar url')
    // const coverImage = null;
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // console.log('coverImage: ', coverImage?.url)
    // console.log('coverImagelocal path: ', coverImageLocalPath)
    if(!avatar) {
        throw new ApiError(400, "Avatar File Required")
    }
    const user = await User.create({
        fullName, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

});

const loginUser = asyncHandler(async (req, res)=>{
    const {email, username, password} = req.body;

    if(!username || !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or:[{username}, {email}]
    })
    if (!user) {
        throw new ApiError(404, "Username doesnot exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid login credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }
    
    return res.status(200).
    cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged in successfully"
            )
    )
})

const logoutUser = asyncHandler(async (req, res)=> {
    const options = {
        httpOnly:true,
        secure:true
    }
    await User.findByIdAndUpdate(
        { 
            $set: {
                refreshToken:undefined,
            },
        },
        {
            new:true
        }
    )
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

export { registerUser, loginUser, logoutUser };
 