import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

// Controller to handle user registration
const registerUser = asyncHandler(async (req, res) => {

       // steps for register user
    // get required user details
    //validations - not empty
    // check if user already exists - User.findOne({"provided email/username"});
    //check for images , check for avatar
    // upload them to cloudinary - URL
    //create user object - create entry in db 
    // remove password and refresh token field from response 
    //check for user creation cosnt user = User.create({...})
    //if user return  user
    //else return null




    // Step 1: Get required user details from request body
    const { fullName, username, email, password } = req.body;
    console.log(fullName, username, email, password);

    // Step 2: Basic validation - Check if any required field is empty
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Step 3: Check if a user already exists with the same username or email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }] // $or operator checks for either matching username or email
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Step 4: Check for image files (avatar is mandatory, coverImage is optional)
    console.log(req.files); // Log files to debug or confirm uploads

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Step 5: Upload avatar and cover image to Cloudinary and get URLs
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath); // coverImage can be optional

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar to cloud");
    }

    // Step 6: Create new user in the database with the uploaded image URLs
    const user = await User.create({
        fullName,
        email,
        avatar: avatar.url,                         // Cloudinary avatar URL
        coverImage: coverImage?.url || "",          // Cloudinary cover image URL (optional)
        password,
        username: username.toLowerCase()            // Store username in lowercase for consistency
    });

    // Step 7: Retrieve the created user and exclude sensitive fields like password and refreshToken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // Prevent sending sensitive data in response
    );

    // Step 8: If user creation failed for any reason, return 500
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Step 9: Send final success response with created user details
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );

    // Redundant return (won't be reached) - only kept for testing/debug
    return res.status(200).json({
        fullName,
        email,
        password,
        username
    });

});

export {
    registerUser
};
