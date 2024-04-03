const mongoose = require("mongoose")

const {Schema, model} = mongoose

const contactSchema = new Schema({
    username: {
        type:String,
        required:true
    },
    email: {
        type:String,
        required:true
    },
    subject:{
        type:String,
        required:true
    },
    message:{
        type:String,
        required:true
    }
})

const contactForm = mongoose.model("contact", contactSchema)
module.exports = contactForm