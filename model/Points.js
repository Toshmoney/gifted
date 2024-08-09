const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const PointSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    points: {
        type: Number,
        default: 0,
    },
    lastSpinDate: {
        type: Date,
    },
    has_spin: {
        type: Boolean,
        default: false,
    },
    plan_type: {
        type: String,
        enum: ['weekly', 'monthly'],
        required: true,
    },
}, { timestamps: true });

const Points = model('Points', PointSchema);

module.exports = Points;
