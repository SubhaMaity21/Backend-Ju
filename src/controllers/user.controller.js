import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {uploadOnCloudinary,deleteFromCloudinary,extractPublicId} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const generateAccessAndRefreshTokens = async(userId)=>{
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave:false })
    return {accessToken,refreshToken}

    
  } catch (error) {
    throw new ApiError(500,error.message)
  }
}

const registerUser = asyncHandler(async (req, res,next) => {
  // Get user details from frontend
  const { fullName, email, username, password } = req.body;

  // Validate user details (not empty)
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists: username, email
  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new ApiError(400, "User already exists");
  }

  // Check for images, avatar
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // Upload them to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  // Create user object - create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Remove password and refresh token field from response (for frontend)
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Failed to register the user");
  }

  // Return response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));

  
});
const loginUser = asyncHandler(async(req,res)=>{
  // req body - data
  // username or email
  //find the user
  //password check
  // access and refresh token
  // return user and tokens through cookies

  const {email,username,password} = req.body;
  if(!username && !email){
    throw new ApiError(400,"username or email required")
  }

  const user = await User.findOne({
    $or:[{username},{email}]
  })

  if(!user){
    throw new ApiError(400,"User not found")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)


  if(!isPasswordValid){
    throw new ApiError(400,"Invalid user credentials")
  }

  // console.log(user._id);
  
  const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
  // if you miss this await - you will enter in a infinite time loop for finding the error - haha
  const options = {
    httpOnly: true,
    secure:true
  }
 


res.status(200)
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,{user:loggedInUser,accessToken,refreshToken},
      "user logged in successsfully"
    )
  )
  
})


const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
      req.user._id,
      {
          $unset: {
              refreshToken: 1 // this removes the field from document
          }
      },
      {
          new: true
      }
  )

  const options = {
      httpOnly: true,
      secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))

})


const refreshAccessToken = asyncHandler(async(req,res)=>{
    // get the refresh token from the cookie
    // verify the refresh token
    // get the user from the refresh token
    // generate new access token
    // return the new access token

  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
  throw new ApiError(401,"Unauthorized Request")
  
  }
  try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken._id)
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
  
    if(incomingRefreshToken != user.refreshToken){
      throw new ApiError(401,"Refresh token is expired or used")
    } 
  
    const options = {
      httponly:true,
      secure:true
    }
  
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(200,{accessToken,refreshToken},"Access token refreshed successfully")
    )
} catch (error) {
  throw new ApiError(401,error.message)
}

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

  const {oldPassword,newPassword} = req.body
  const user = await User.findById(req.user?._id)
  const PasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if(!PasswordCorrect){
    throw new ApiError(400,"Invalid password")
  }
  user.password = newPassword
  await user.save({validateBeforeSave:false})
  return res
  .status(200)
  .json(new ApiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentuser = asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {email,fullName} =  req.body
  if(!(fullName || email))
    throw new ApiError(400,"Fullname or email required")

  // const user = await User.findById(req.user._id).select("-password -refreshToken ")
  // if(!user){
  //   throw new ApiError(404,"User not found")
  // }
  // user.email = email;
  // user.fullName = fullName;
  // await user.save({validateBeforeSave:false})



  const user = await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        fullName:fullName,
        email:email
        }
    
    },
  {
    new:true
  }
  
).select("-password -refreshToken")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Account details updated successfully"))

})
  
const updateAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar is required")
  }

  const oldUser = await User.findById(req.user._id)
  const oldAvatar = oldUser?.avatar
  
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if(!avatar){
    throw new ApiError(500,"Failed to upload avatar")
  }

  const user = await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        avatar:avatar.url
      }
    },{
      new:true
    }
  ).select("-password")

  if(oldUser){
    const publicId = extractPublicId(oldAvatar)
    if(publicId){
      await deleteFromCloudinary(publicId)
      
      
    }
  }



  return res
  .status(200)
  .json(new ApiResponse(200,user,"Avatar Updated Successfully"))
})  
const updateCoverImage = asyncHandler(async(req,res)=>{

  const coverImageLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"Cover Image is required")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage){
    throw new ApiError(500,"Failed to upload avatar")
  }

  const user = await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },{
      new:true
    }
  ).select("-password")


  return res
  .status(200)
  .json(new ApiResponse(200,user,"Cover Image Updated Successfully"))
})  


const getuserChannelprofile = asyncHandler(async(req,res)=>{
  const {username} = req.params;
  if(!username?.trim()){
    throw new ApiError(400,"username is missing")
  }

  const channel = await User.aggregate([
    {
      $match:{
        username:username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
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
        channelsSubscribedToCount:{
          $size:"$subscribedTo"
        },
        
        isSubscribed:{
          $cond:{
            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
          }
        
      }
    },
    {
      $project:{
        fullName:1,
        username:1,
        subscribersCount:1,
        channelsSubscribedToCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,
        email:1
      }
    }
  ])


  if(!channel.length){
    throw new ApiError(400,"channel not found")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
})


const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match:{
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[{
                $project:{
                  fullName:1,
                  username:1,
                  avatar:1
                }
              }]
            }
          },{
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(new ApiResponse(200,user[0]?.watchHistory,"Watch history fetched successfully"))
})

export { registerUser, loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentuser,updateAccountDetails,updateAvatar,updateCoverImage,getuserChannelprofile,getWatchHistory} ;

