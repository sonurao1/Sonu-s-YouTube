import {connectWithDB} from "./db/index.js"
import dotenv from "dotenv"
import {app} from "./app.js"
import cookieParser from "cookie-parser"

dotenv.config({
    path: "./.env"
})



console.log("server started")
// console.log(process.env.MONGODB_URI)
connectWithDB().then(() => {
    console.log("mongodb connected");
    app.listen(process.env.PORT || 8000  , () => console.log(`server is running at port ${process.env.PORT}`))
})
.catch((error) => console.log("connection failed :--" , error))
  