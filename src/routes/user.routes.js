import {Router} from "express"
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
const router = Router();


router.route("/register")
.post(
    upload.fields([              // here it is multer which is working here as middleware to upload files
        {
         name: "avatar",
         maxCount: 1,
        },
        {
          name:"coverImage",
          maxCount: 1,
        }
    ]) ,
    registerUser
    )



export default router