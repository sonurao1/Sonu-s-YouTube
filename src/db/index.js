import mongoose from "mongoose"
import {DB_NAME} from "../contants.js"


 const connectWithDB = async () => {
         try {
            console.log(process.env.MONGODB_URI)
            await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
            console.log("connection ho gya hai mst")
         } catch (error) {
            console.log("MONGODB connection failed :- " , error)
         }
}

export {
    connectWithDB
}