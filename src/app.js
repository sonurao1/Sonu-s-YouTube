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



export {
    app
}