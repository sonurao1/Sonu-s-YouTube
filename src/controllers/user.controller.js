import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary , deleteFileFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import JWT from "jsonwebtoken"

//we are making seperate function for generate access token and refresh token because we are using those generateToken method so many times which are defined in user model file 
const generateAccessAndRefreshTokens = async (userId) => {
    // console.log(userId , "userId recieved in generateAccessAndRefreshToken function")
     try {
       const user =  await User.findById( userId )
       const accessToken =  user.generateAccessToken()
       const refreshToken =   user.generateRefreshToken()
    //    console.log(user , accessToken , refreshToken)

       user.refreshToken = refreshToken
    //    now at this point i have set the refreshToken to user doc and it is time to save the doc in mongodb  that is why we are using save() method, if we only use save method then mongodb validate all the fields which i dont want so i have pass argument to save method that save ({validateBeforeSave: false})
          await user.save({validateBeforeSave: false})

          return {accessToken , refreshToken}
     } catch (error) {
        console.log(error)
        throw new ApiError(500 , "Someting went wrong while generating refresh and access token")
     }
}



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
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    console.log(avatarLocalPath , "yaha tk code chl rha hai")
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Step 5: Upload avatar and cover image to Cloudinary and get URLs
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath); // coverImage can be optional
    

    console.log(avatar )

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


const loginUser = asyncHandler( async (req, res) => {    
        // 1. Get email/username and password from req.body
        // 2. Check if user exists in DB with this email/username
        // 3. Compare the entered password with hashed password (bcrypt)
        // 4. If valid, generate access token (short expiry) and refresh token (long expiry)
        // 5. Store refresh token in HttpOnly cookie
        // 6. Optionally, set access token in cookie or return in response body
        // 7. Redirect or respond with success and user info
  
        console.log(req.body)
        const {email, username , password} = req.body;
        if(!username && !email){
            throw new ApiError(400 , "username or email is required")
        }

       const user = await User.findOne({
            $or: [{username} ,{email}]
        })

        if(!user) {
            throw new ApiError(404 , "user does not exit")
        }

        const isPasswordValid =  await user.isPasswordCorrect(password)

        if(!isPasswordValid){
            throw new ApiError(401 , "Invalid user credendials")
        }

       const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)


       const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

       const options = {
        httpOnly: true,
        secure: true,
       }

       return res
       .status(200)
       .cookie("accessToken" , accessToken , options)
       .cookie("refreshToken" , refreshToken , options)
       .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser , accessToken , refreshToken
            },
            "User logged In Successfully"
        )
       )

} )

const logoutUser = asyncHandler(async(req, res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true,
    }

    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(
        new ApiResponse(200 , {} , "User logged Out Successfully")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {

   try {
     const incomingRefreshToken =
         req.cookies?.refreshToken ||
         req.header("Authorization")?.replace("Bearer ", "");
 
     if (!incomingRefreshToken) {
         throw new ApiError(400, "Refresh token is required");
     }
 
     // Verify the refresh token
     let decodedToken;
     try {
         decodedToken = JWT.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
     } catch (err) {
         throw new ApiError(401, "Invalid or expired refresh token");
     }
 
     const user = await User.findById(decodedToken?._id);
 
     if (!user) {
         throw new ApiError(401, "Invalid refresh token - user not found");
     }
 
     if (incomingRefreshToken !== user.refreshToken) {
         throw new ApiError(401, "Invalid refresh token - token mismatch");
     }
 
     const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
 
 
     const options = {
         httpOnly: true,
         secure: true,
     }
 
     return res
         .status(200)
         .cookie("refreshToken", newRefreshToken,options)
         .cookie("accessToken", accessToken,options)
         .json(
             new ApiResponse(
                 200,
                 {
                     accessToken,
                     refreshToken: newRefreshToken,
                 },
                 "Successfully generated access token"
             )
         );
   } catch (error) {
    console.log("Error found while generating refreshAccessToken",error)
      throw new ApiError(400 , "invalid refresh token")
   }

});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword ,  newPassword} = req.body;

  const user =  await User.findById( req.user?._id )

  const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400 , "Invalid old password")
  }

  user.password = newPassword
 await user.save({validateBeforeSave:false})


 return res.status(200).json(
    new ApiResponse(200, {} , "Password changed successfully")
);



})


const getCurrentUser = asyncHandler(async(req, res) => {
     return res
     .status(200)
     .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})


const changeAccountDetails = asyncHandler(async(req, res) => {
    try {
        const {fullName , email} = req.body
        
        if(!fullName && !email){
            throw new ApiError(400 , "fullName or user name is required")
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullName,
                    email
                }
            },
            {new:true}
        ).select("-password")
    
        if(!user){
            throw new ApiError(400, "Error while updating your account details")

        }
    
        return res
        .status(200)
        .json(new ApiResponse(200 , {user} , "Your details successfully updated"))
    } catch (error) {
        console.log("Error found in updating user account details" , error)
        throw new ApiError(500 , `Server Error while updating details : ${Error?.message}`)
    }

} )


const updateUserAvatar = asyncHandler(async ( req,res ) => {
   const avatarLocalPath = req.file?.path;

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing")
   }

   const avatarCloudinaryPath = await uploadOnCloudinary(avatarLocalPath);

   if(!avatarCloudinaryPath.url){
    throw new ApiError(400, "Error while uploading on avatar")
   }

   const oldAvatar = await User.findById(req.user?._id).select("avatar")

   const user = await User.findByIdAndUpdate(
    req.user?.id,
    {
        $set: {
            avatar:avatarCloudinaryPath?.url
        }
    },
    {new:true}
   ).select("-password")

   if(!user){
    throw new ApiError(400 , "getting error while updating avatar")
   }

   if (!oldAvatar || !oldAvatar.avatar) {
    throw new ApiError(400, "No old avatar found");
  }

         // todo: delete old file from cloudinary
         const parts = oldAvatar.avatar.split("/");
         const fileNameWithExtension = parts[parts.length - 1]; // "mjbjnkmqukuzgvmhnqxl.png"
         const publicId = fileNameWithExtension.split(".")[0]; // "mjbjnkmqukuzgvmhnqxl"

    const deleteOldAvatar =  await deleteFileFromCloudinary(publicId)


   return res
   .status(200)
   .json(new ApiResponse(200 , user , "Avatar image updated successfully"))


})



const updateUserCoverImage = asyncHandler(async ( req,res ) => {
    const coverImageLocalPath = req.file?.path;
 
    if(!coverImageLocalPath){
     throw new ApiError(400,"cover image file is missing")
    }
 
    const coverImageCloudinaryPath = await uploadOnCloudinary(coverImageLocalPath);
 
    if(!coverImageCloudinaryPath.url){
     throw new ApiError(400, "Error while uploading on cover image")
    }
  
    const oldCoverImage = await User.findById(req.user?._id).select("coverImage")



    const user = await User.findByIdAndUpdate(
     req.user?.id,
     {
         $set: {
             coverImage:coverImageCloudinaryPath?.url
         }
     },
     {new:true}
    ).select("-password")
 
    if(!user){
     throw new ApiError(400 , "getting error while updating cover image")
    }

    // todo: delete old file from cloudinary 
    if (!oldCoverImage || !oldCoverImage.coverImage) {
        throw new ApiError(400, "No old Cover image found");
      }
    
             // todo: delete old file from cloudinary
             const parts = oldCoverImage.coverImage.split("/");
             const fileNameWithExtension = parts[parts.length - 1]; // "mjbjnkmqukuzgvmhnqxl.png"
             const publicId = fileNameWithExtension.split(".")[0]; // "mjbjnkmqukuzgvmhnqxl"
    
        const deleteOldCoverImage =  await deleteFileFromCloudinary(publicId)
 
    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Cover image updated successfully"))
 
 
 })


 const getUserChannelProfile = asyncHandler(async (req, res) => {
        const {username} =  req.params;

        if(!username?.trim()){
             throw new ApiError(400 , "username is missing")
        }

   const channel = await  User.aggregate([
                 {
                    $match:{
                        username:username?.lowerCase()
                    }
                 },
                 {
                    $lookup:{
                        from:"subscriptions",
                        localField:"_id",
                        foreignField:"channel",
                        as:"suscbribers"
                    }
                 },
                 {
                    $lookup:{
                        from:"subscriptions",
                        localField:"_id",
                        foreignField:"subscriber",
                        as:"subscribedTo"
                    }
                 },
                 {
                    $addFields:{
                        subscribersCount:{
                            $size:"$subscribers"
                        },
                        channelSubscribedToCount:{
                            $size:"$subscribedTo"
                        },
                        idSubscribed:{
                            $cond:{
                                if:{$in:[req.user?.id, "$subscribers.subscriber"]},
                                then:true,
                                else: false,
                            }
                        }
                    }
                 },
                 {
                    $project:{
                         fullName:1,
                         username:1,
                         email: 1,
                         subscribersCount:1,
                         channelSubscribedToCount:1,
                         idSubscribed:1,
                         avatar:1,
                         coverImage:1,
                    }
                 }
      ])

      console.log(channel);

      if (!channel || channel.length === 0) {
          throw new ApiError(404, "Channel not found");
      }

      return res
      .status(200)
      .json(new ApiResponse(200 , channel[0] , "user channel fetched successfully "))


 })



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    changeAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile, 
};
