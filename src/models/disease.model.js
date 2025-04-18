import mongoose , {Schema} from "mongoose"

const diseaseSchema = new Schema({
  
    diseaseIdentified:{
        type:String,
        required:true,
        trim:true,
    },
   
    image:{
        type:String,
        required:true,
    }
},{timestamps:true
})

export const Disease = mongoose.model("Disease", diseaseSchema);