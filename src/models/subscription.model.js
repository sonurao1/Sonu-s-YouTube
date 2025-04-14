import {Schema , model} from "mongoose"

const subscriptionSchema = new Schema({

    subscriber: {
        type: Schema.Types.ObjectId, //one who is subscribing
        ref: "User"
    },
    channel:{
        type: Schema.Types.ObjectId,  //one to whom "subscriber" is subscribing
        ref: "User"
    }

} , {timestamsp:true})


export const Subscription = model("Subscription" , subscriptionSchema)