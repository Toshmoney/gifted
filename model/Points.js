const mongoose = require('mongoose')
const {Schema, model} = mongoose

const PointSchema = new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    points: {
        type: Number,
        default: 0
    },

    lastSpinDate: {
        type: Date,
    }
}, { timestamps: true })


const Points = model('Points', PointSchema);

module.exports = Points;