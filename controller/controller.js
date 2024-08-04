require("dotenv").config();
const key = process.env.PAYSTACK_PUBLIC_KEY;
const secrete = process.env.secrete;
const { dashboardData } = require("../utils/dashboardData");
const { formatPlan } = require("../utils");
const DataPlan = require("../model/DataPlan");
const User = require('../model/User.db');
const { CustomAPIError } = require("../handleError");
const { StatusCodes } = require("http-status-codes");
const { default: axios } = require("axios");
const Question = require("../model/Quiz");
const Wallet = require("../model/Wallet");
const nodemailer = require("nodemailer");
const referralModel = require("../model/referral");
const Transaction = require("../model/Transaction");


const homePage = async (req, res) => {
  const user = req?.user
  res.status(200).render("pages/home", {user});
};

const dashboard = async (req, res) => {
  const data = await dashboardData(req.user);
  // console.log(data);
  res.status(200).render("dashboard/dashboard", data);
};

const airtime = async (req, res) => {
  const data = await dashboardData(req.user);
  res.status(200).render("dashboard/airtime", data);
};

const dataplan = async (req, res) => {
  const data = await dashboardData(req.user);
  try {
    let plans = await DataPlan.find({ network_id: "1" });
    plans = plans.map((plan) => formatPlan(plan));
    data.plans = plans;
  } catch (error) {
    console.log(error);
  } finally {
    res.status(200).render("dashboard/dataplan", data);
  }
};

const billpayment = (req, res) => {
  res.status(200).render("dashboard/billpayment");
};

const trades = (req, res) => {
  res.status(200).render("dashboard/trades");
};

const billPayer = async (req, res) => {
  const data = await dashboardData(req.user);
  const urlParams = req.params;
  const service = urlParams.service;
  if (service === "electricity") {
    return res.status(200).render("dashboard/electricity", data);
  }
  if (service === "tv") {
    return res.status(200).render("dashboard/tv", data);
  }
  if (service === "exam") {
    return res.status(200).render("dashboard/exam", data);
  }
  return res.status(404).json({
    message: "page you are looking for does not exist",
  });
};

// convert referral commission to balance

const convertRef = async(req, res)=>{
  const user = req.user;
  const wallet = await Wallet.findOne({user: user._id});
  const referral = await referralModel.findOne({user:user._id})
  const availableBal = wallet.current_balance;
  const commission = referral.referralCommission;

  wallet.current_balance += commission;
  referral.referralCommission -= commission
  await wallet.save()
  await referral.save()
  res.redirect("/wallet")

}

// Send Money To Friends

const transferToFriends = async(req, res)=>{
  try {
    const { amount, email } = req.body;

    // Find sender and recipient users
    const sender = await User.findById(req.user._id);
    const recipient = await User.findOne({ email });

    if (!sender || !recipient) {
      req.flash('error', 'Invalid sender or recipient');
      return res.redirect('/transfer-to-friends');
    }

    if (email.toLowerCase() == req.user.email) {
      req.flash('error', 'You can not send money to yourself');
      return res.redirect('/transfer-to-friends');
    }

    // Find sender and recipient wallets
    const senderWallet = await Wallet.findOne({ user: sender._id });
    const recipientWallet = await Wallet.findOne({ user: recipient._id });

    // Validate sufficient funds
    if (senderWallet.current_balance < Number(amount)) {
      req.flash('error', 'Insufficient funds');
      return res.redirect('/transfer-to-friends');
    }

    // Create a transaction record for the sender
    const senderTransaction = new Transaction({
      user: sender._id,
      balance_before: senderWallet.current_balance,
      balance_after: senderWallet.current_balance - amount,
      amount: amount,
      service: 'wallet',
      type: 'debit',
      status: 'completed',
      description: `Transfer to ${recipient.username}`,
      reference_number: 'transfer-reference',
    });

    // Create a transaction record for the recipient
    const recipientTransaction = new Transaction({
      user: recipient._id,
      balance_before: recipientWallet.current_balance,
      balance_after: recipientWallet.current_balance + amount,
      amount: amount,
      service: 'wallet',
      type: 'credit',
      status: 'completed',
      description: `Transfer from ${sender.username}`,
      reference_number: 'transfer-reference',
    });

    // Update sender and recipient wallet balances
    senderWallet.previous_balance = senderWallet.current_balance;
    senderWallet.current_balance -= Number(amount);

    recipientWallet.previous_balance = recipientWallet.current_balance;
    recipientWallet.current_balance += Number(amount);

    // Save changes to the database
    await senderTransaction.save();
    await recipientTransaction.save();
    await senderWallet.save();
    await recipientWallet.save();

    // Notify sender and recipient via email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const senderMailOptions = {
      from: 'giftedbrainz@gmail.com',
      to: sender.email,
      subject: 'Transfer Confirmation',
      text: `You have successfully transferred NGN${amount} to ${recipient.username}.`,
    };

    const recipientMailOptions = {
      from: 'giftedbrainz@gmail.com',
      to: recipient.email,
      subject: 'Transfer Received',
      text: `You have received NGN${amount} from ${sender.username}.`,
    };

    transporter.sendMail(senderMailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Sender Email sent:', info.response);
      }
    });

    transporter.sendMail(recipientMailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Recipient Email sent:', info.response);
      }
    });

    req.flash('info', 'Transfer successful');
    return res.redirect('/transfer-to-friends');
  } catch (error) {
    console.error('Error during transfer:', error);
    req.flash('error', 'Error during transfer. Please try again.');
    return res.redirect('/transfer-to-friends');
  }
}

const sendToFriends = async(req, res)=>{
  const data = await dashboardData(req?.user);
  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };

  const {user} = data
  res.render("dashboard/transtofriends", {user, msg:messages})
}

// Customized Trade url
const tradeService = async (req, res) => {
  const data = await dashboardData(req.user);
  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };
  const urlParams = req.params;
  const service = urlParams.service;
  if (service === "paypal") {
    return res.status(200).render("dashboard/paypal", {data, messages, submissionSuccessful: res.locals.submissionSuccessful});
  }
  if (service === "payoneer") {
    return res.status(200).render("dashboard/payoneer", {data, messages, submissionSuccessful: res.locals.submissionSuccessful});
  }
  if (service === "giftcard") {
    return res.status(200).render("dashboard/giftcard", {data, messages, submissionSuccessful: res.locals.submissionSuccessful});
  }
  if (service === "crypto") {
    return res.status(200).render("dashboard/crypto", {data, messages, submissionSuccessful: res.locals.submissionSuccessful});
  }
  return res.status(404).json({
    message: "page you are looking for does not exist",
  });
};

const wallet = async (req, res) => {
  const data = await dashboardData(req.user);
  res.status(200).render("dashboard/wallet", data);
};
const fundWallet = (req, res) => {
  res.status(200).render("dashboard/fundwallet", {
    key: key,
    name: req.user.name,
    email: req.user.email,
  });
};

const walletWithdraw = async(req, res) => {

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

    const banks = await axios.get('https://api.paystack.co/bank', {
        headers:{
            "Authorization":`Bearer ${PAYSTACK_SECRET_KEY}`
        }
    })
    .then(data => data.data.data)
    .catch(err =>{
        console.log(err);
    })

  const errorMg = req.flash("error").join(" ");
  const infoMg = req.flash("info").join(" ");
  const messages = {
    error: errorMg,
    info: infoMg,
  };

  res.status(200).render("dashboard/withdraw", {msg : messages, secrete: secrete, banks});
};


const verifyNow = (req, res) => {
  res.status(200).render("dashboard/verifynow");
};
const setting = async (req, res) => {
  const data = await dashboardData(req.user);
  const {user} = data
  res.status(200).render("dashboard/setting", {user});
};
const profile = async (req, res) => {
  const data = await dashboardData(req?.user);
  
  res.status(200).render("dashboard/profile", data);
};



const privacyPolicy = async (req, res) => {
  res.status(200).render("dashboard/privacy");
};

const businessBal = async (req, res) => {
  const data = await dashboardData(req.user);
  res.status(200).render("admin/businessbal", data);
};



const aboutPage = async (req, res) => {
  const user = req?.user
  res.status(200).render("pages/about-us", {user});
};

const blog = async (req, res) => {
  const user = req?.user
  res.status(200).render("pages/blog", {user});
};

const contact = async (req, res) => {
  const user = req?.user
  res.status(200).render("pages/contact", {user});
};

const support = async (req, res) => {
  const user = req?.user
  res.status(200).render("pages/support", {user});
};

const termsCondition = async (req, res) => {
  const user = req?.user
  res.status(200).render("pages/terms-condition", {user});
};

const getQuiz = async(req, res)=>{
  try {
    // Fetch a random question from the database
    const randomQuestion = await Question.findOne().skip(Math.floor(Math.random() * await Question.countDocuments()));

    res.render('dashboard/quiz', { question: randomQuestion });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

const quizPage = async(req, res)=>{
  const data = await dashboardData(req?.user);
  res.render("dashboard/quizpage", data)
}

const createQuiz = async(req, res)=>{
  try {
    const { question, options, correctOption } = req.body;

    // Convert options to an array
    const optionsArray = options.split(',');

    const newQuestion = new Question({
      question,
      options: optionsArray,
      correctOption: parseInt(correctOption, 10),
    });

    await newQuestion.save();

    res.redirect('/quiz/admin-post');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const completeQuiz = async (req, res) => {
  try {
    const { quizId, score } = req.body;
    const userId = req.user._id;

    // Update user's quiz score
    await User.findByIdAndUpdate(userId, {
      $push: { quizScores: { quizId, score } }
    });

    // Fetch all users and sort them based on the total score
    const allUsers = await User.find().populate('quizScores.quizId');
    allUsers.sort((a, b) => {
      const totalScoreA = a.quizScores.reduce((total, entry) => total + entry.score, 0);
      const totalScoreB = b.quizScores.reduce((total, entry) => total + entry.score, 0);
      return totalScoreB - totalScoreA; // Sort in descending order
    });

    // Assign rewards to the top 3 users
    for (let i = 0; i < Math.min(allUsers.length, 3); i++) {
      let reward;
      switch (i) {
        case 0:
          reward = 100;
          break;
        case 1:
          reward = 80;
          break;
        case 2:
          reward = 70;
          break;
        default:
          reward = 0; // No reward for other users
      }
      const user = allUsers[i];
      user.reward = reward;
      await user.save();
    }

    res.status(200).send('Quiz completed successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


const getLeadingUser = async(req, res)=>{
  try {
    // Fetch top users based on quiz scores
    const topUsers = await User.find().sort({ 'quizScores.score': -1 }).limit(10);

    res.render('dashboard/quizpage', { topUsers });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

const adminPostQuiz = async(req, res)=>{
  const data = await dashboardData(req?.user)
  res.render("admin/create-quiz", data)
};

const referral = async(req, res)=>{
  const data = await dashboardData(req?.user);
  res.render("dashboard/referral", data)
}

const spin = async(req, res)=>{
  const data = await dashboardData(req?.user);
  res.render('dashboard/spinthewheel', data)
}

const spinNow = async(req, res)=>{
  const data = await dashboardData(req?.user);
  res.render('dashboard/spinnow', data)
}

const createCourses = async(req, res)=>{
  const data = await dashboardData(req?.user);
  res.render('admin/createcourse', data)
}

module.exports = {
  homePage,
  dashboard,
  createCourses,
  airtime,
  quizPage,
  referral,
  convertRef,
  dataplan,
  billpayment,
  wallet,
  fundWallet,
  setting,
  verifyNow,
  profile,
  billPayer,
  privacyPolicy,
  businessBal,
  tradeService,
  trades,
  walletWithdraw,

  getQuiz,
  createQuiz,
  adminPostQuiz,

  aboutPage,
  blog,
  contact,
  support,
  termsCondition,
  spin,
  spinNow,
  transferToFriends,
  sendToFriends
};
