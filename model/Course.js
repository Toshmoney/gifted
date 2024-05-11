const mongoose = require("mongoose")
const {Schema, model} =  mongoose
const courseSchema = new Schema({
    title : {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required:true
    },
    point:{
        type:Number
    },
    courseDetails:{
        type:String
    },
    courseLink:[String],
    courseImage: {
        type: String,
    },
  purchasedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
},
{timestamps:true})

const Course = model("Course", courseSchema);

module.exports = Course