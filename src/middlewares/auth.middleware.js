import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken"
import { User }from "../models/user.model.js"
 

export const verifyJWT = asyncHandler(async(req, res, next) => {
//    req.cookies?.accessToken || req.header("Authorization")?.split(" ")[1]
try {
    
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer " , "")
    
     if(!token){
        throw new ApiError(401 , "Unauthorized request")
     }
     console.log(token)
    
     const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
    
    
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
     if(!user){
        //TODO: discuss about frontend
        throw new ApiError(401 , "Invalid Access Token")
     }
    
     req.user = user;
     return next();
} catch (error) {
    throw new ApiError(401 , error?.messege || "Invalid Access Token")
}

})