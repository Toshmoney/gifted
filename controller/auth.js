require("dotenv").config();
const User = require("../model/User.db");
const Wallet = require("../model/Wallet");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const ejs = require('ejs');
const fs = require('fs');
const referralModel = require("../model/referral");
const Points = require("../model/Points");
const Transaction = require("../model/Transaction");

const BASE_URL = process.env.BASE_URL;

const logInPage = async (req, res) => {
  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };
  res.status(200).render("pages/signin", { messages });
};

const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return token;
};

const forgotPassword = async (req, res) => {
  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };
  res.status(200).render("pages/forgotPassword", { messages });
};
const confirmPass = async (req, res) => {
  res.status(200).render("pages/confirmation");
};

const confirmReset = async (req, res, next) => {
  const { email } = req.body;

  // check if user enter email
  if (!email) {
    req.flash("error", "You have not entered any email!");
    return res.redirect("/forgot-password");
  }

  // check if email exist
  const existingEmail = await User.findOne({ email: email });
  if (!existingEmail) {
    req.flash("error", "There is no user with this email");
    return res.redirect("/forgot-password");
  }

  const resetToken = generateResetToken();

  existingEmail.resetToken = resetToken;
  existingEmail.resetExpires = Date.now() + 3600000;
  await existingEmail.save();

  // Send an email with the reset link
  const resetLink = `${BASE_URL}/reset-password/${resetToken}`;

  // Use Nodemailer to send the reset email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: "Password Reset From Giftedbrainz",
    text: `Click the following link to reset your password: ${resetLink} \n Ignore if you didn't request for password reset`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.log(err);
      req.flash("error", "Error while sending reset link.");
      return res.redirect("/confirmation");
    }
    req.flash(
      "info",
      `An email has been sent to  ${existingEmail.email} with further instructions.`
    );
    res.redirect("/forgot-password");
  });
};

const getPasswordUpdatedPage = async (req, res) => {
  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };
  const user = await User.findOne({
    resetToken: req.params.token,
    resetExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/login");
  }
  res.render("pages/reset", { token: req.params.token, messages });
};

const updatePassword = async (req, res) => {
  const user = await User.findOne({
    resetToken: req.params.token,
    resetExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/login");
  }
  if (req.body.password === req.body.confirm) {
    user.setPassword(req.body.password, (err) => {
      user.resetToken = undefined;
      user.resetExpires = undefined;

      user.save();
      req.flash("info", "Password has been reset successfully.");
      res.redirect("/login");
    });
  } else {
    req.flash("error", "Passwords do not match.");
  }
};

const signUpPage = async (req, res) => {
  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };
  res.status(200).render("pages/signup", { messages });
};

const signout = (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
};

const newUser = async (req, res, next) => {
  const { plan_type, username, password, email, confirmPassword, referralCode } = req.body;

try {
  // Check if passwords match
  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match");
    return res.redirect("/sign-up");
  }

  // Check required fields
  if (!username || !email || !plan_type) {
    req.flash("error", "Username, email, and plan type are required");
    return res.redirect("/sign-up");
  }

   // Check if user already exists
   const existingUser = await User.findOne({email : email.toLowerCase()});
   if (existingUser) {
     req.flash("error", "User with this email already exist");
     return res.redirect("/sign-up");
   }

  const user = new User({
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
    plan_type,
    referralCode: username.toLowerCase(),
  });

  // Check if user was referred by a referral code
  if (referralCode) {
    const referral = await referralModel.findOne({ referralCode: referralCode.toLowerCase() });
    if (referral) {
      user.referredBy = referralCode;
      referral.referredUsers.push(user._id)
      referral.referralCommission +=1000;
      await referral.save()
    }else{
      req.flash("error", "No one with that referral code");
     return res.redirect("/sign-up");
    }
  }

  // Common logic for user creation
  const createUser = async () => {
    try {
      await user.save();
      const userWallet = new Wallet({ user: user._id });
      await userWallet.save();
      const userPoints = new Points({ user: user._id });
      await userPoints.save();
      const userReferral = new referralModel({ user: user._id, referralCode: username.toLowerCase() });
      await userReferral.save();
      req.flash("info", "Signed up successfully ..");
      return res.redirect("/makePayment");
    } catch (error) {
      console.error("Error creating user:", error);
      return req.flash("error", "Error creating user");
      // res.redirect("/sign-up");
    }
  };

  // Register user using Passport.js
  User.register(user, password, (err) => {
    if (err) {
      // console.error("Error registering user:", err);
      req.flash("error", "Error registering user");
    }
    createUser();
  });
} catch (error) {
  console.error("Unexpected error:", error);
  req.flash("error", "Unexpected error");
  res.redirect("/sign-up");
}

};

const makePayment= (req, res)=>{
  let amount_to_pay;
  const user = req.user
  const planType = user.plan_type;
  const email = user.email

  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };

  if(!planType){
      req.flash("error", "Sign in to continue");
      return res.redirect("/login")
  }

  if(planType === 'weekly'){
      amount_to_pay = 2400
  }else{amount_to_pay = 4600}
  res.render('dashboard/makepayment', {amount_to_pay, email, messages})
}
const confirmPayment = async (req, res) => {
  const user = req.user;
  try {
    const { reference, amount } = req.body;

    if (!reference) {
      req.flash("error", "Unable to generate reference code");
      return res.redirect('/makePayment');
    }

    const baseurl = `https://api.paystack.co/transaction/verify/${reference}`;

    // Fetch the Paystack transaction details
    const response = await fetch(baseurl, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "content-type":"application/json"
      },
    }).then(response => response.json());

    if (!response.status) {
      // Transaction reference not found
      req.flash("error", "Transaction reference not found");
      console.log(response);
      return res.redirect("/makePayment");
    }

    // Transaction reference found, proceed with further processing
    const referredUser = user.referredBy;
    const userRefCode = user.referralCode;
    
    // Retrieve the main user from the database
    const mainUser = await User.findOne({ username: req.user.username });

    if (!mainUser) {
      // User not found, handle appropriately
      req.flash("error", "User not found");
      return res.redirect("/login");
    }

    // Update the user's isPaid status to true
    user.isPaid = true;
    await user.save();

    console.log("User updated:", user);

    if (!referredUser || referredUser !== user.username) {
      // Avoid self-referrals
      await user.save();

      if (referredUser) {
        const referrer = await referralModel.findOne({ referralCode: referredUser });

        if (referrer) {
          console.log("Referrer: ", referrer.referralCode);
          // Update the referrer's referral commission
          referrer.referralCommission += 1000;
          await referrer.save();
        }
      }

      return res.redirect("/dashboard");
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    req.flash("error", "Error confirming payment");
    return res.redirect("/makePayment");
  }
};





module.exports = {
  logInPage,
  logout: signout,
  newUser,
  signUpPage,
  forgotPassword,
  confirmReset,
  confirmPass,
  getPasswordUpdatedPage,
  updatePassword,
  makePayment,
  confirmPayment
};
