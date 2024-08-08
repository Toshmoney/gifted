require("dotenv").config();
const { default: axios } = require("axios");
const { formatTransaction } = require("../utils");
const nodemailer = require("nodemailer");
const ejs = require('ejs');
const fs = require('fs');
const Transaction = require("../model/Transaction");
const Wallet = require("../model/Wallet");
const User = require("../model/User.db")

const addFundsManually = async (req, res) => {
  const { amount, email } = req.body;
  if (!amount || !email) {
    req.flash("error", "User email or amount is missing!")
    return res.redirect("/manual/funding")
  }
  let useracc = await User.findOne({email});

  if (!useracc) {
    req.flash("error", "User email is incorrect!")
    return res.redirect("/manual/funding")
  }
  const user = useracc._id;
  const name = useracc.username
  let wallet = await Wallet.findOne({ user: user });
  if (!wallet) {
    wallet = new Wallet({
      user: user,
      current_balance: 0,
      previous_balance: 0,
    });
  }
  const userBalance = wallet.current_balance;
  const transaction = new Transaction({
    user: user,
    balance_before: userBalance,
    balance_after: userBalance,
    amount: amount,
    service: "wallet",
    type: "credit",
    status: "pending",
    description: `Manual wallet funding with N${amount}`,
    reference_number: "manual-funding",
  });

     // Create a Nodemailer transporter
     const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
  
      // Create the email data
      const mailOptions = {
        from: 'giftedbrainsofficial@gmail.com',
        to: email,
        subject: 'Manual Funding',
        text: `Dear ${name}, your account has been credited NGN${amount} through admin manual funding!`,
      };
  
      // Send the email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
        } else {
          console.log('Email sent:', info.response);
        }
      });

  const amount_paid = Number(amount);
  wallet.previous_balance = userBalance;
  wallet.current_balance = userBalance + amount_paid;
  transaction.status = "completed";
  transaction.balance_after = userBalance + amount_paid;
  await wallet.save();
  await transaction.save();

  req.flash("info", "manual funding is successful, User will now get credited!")
  return res.redirect("/manual/funding")
};

module.exports = addFundsManually;
