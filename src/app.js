import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express();

//middlewares 
app.use(cookieParser())

app.use(cors({
    origin: process.env.CORS_ORIGIN,
}))

app.use(express.urlencoded({extended:true , limit:"16kb"}));

app.use(express.json({limit:"16kb"}))

app.use(express.static("public"))


//Routes import
import userRouter from "./routes/user.routes.js"


//routes declaration
app.use("/api/v1/users" , userRouter)



export {
    app
}