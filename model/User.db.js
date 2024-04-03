const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema(
  {
    username:{
      type:String,
      required:true
  },
  email:{
      type:String,
      required:true
  },
  password:{
      type:String,
      required:true
  },
  isAdmin:{
      type:Boolean,
      default:false
  },
  isPaid:{
      type:Boolean,
      default:false
  },
  has_spin:{
      type:Boolean,
      default:false
  },
  referralCode:{
      type:String
  },
  next_PaymentDate:{
      type:Date
  },
  referredBy: { 
      type: String, 
  },
  plan_type:{
      type:String,
      required:true,
      enum:['weekly','monthly']
  },

  quizScores: [{
    quizId: mongoose.Schema.Types.ObjectId,
    score: Number
  }]
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(user.password, salt);
  user.password = hash;
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
});

module.exports = mongoose.model("User", userSchema);
