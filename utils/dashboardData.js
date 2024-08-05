require("dotenv")
const Wallet = require("../model/Wallet");
const Transaction = require("../model/Transaction");
const Points = require("../model/Points");
const referralModel = require("../model/referral");
const Course = require("../model/Course");
const UserDb = require("../model/User.db");
const baseurl = process.env.BASE_URL;

const formatTransactionDate = (date_string) => {
  const trans_date = new Date(date_string);
  const year = trans_date.getFullYear();
  let month = trans_date.getMonth() + 1;
  let day = trans_date.getDate();
  if (month < 10) {
    month = `0${month}`;
  }
  if (day < 10) {
    day = `0${day}`;
  }
  return `${year}-${month}-${day}`;
};

const formatTransaction = (transaction) => {
  return {
    id: transaction._id,
    description: transaction.description,
    balance_before: transaction.balance_before,
    balance_after: transaction.balance_after,
    amount: transaction.amount,
    status: transaction.status,
    date: formatTransactionDate(transaction.createdAt),
  };
};

const fetchUserTransactions = async (userId, limit = 20) => {
  let transactions = await Transaction.find({ user: userId })
    .sort("-createdAt")
    .limit(limit);
  if (transactions.length === 0) {
    return [];
  }
  transactions = transactions.map((transaction) => {
    const item = transaction.toObject();
    return {
      ...item,
      createdAt: formatTransactionDate(item.createdAt),
      updatedAt: formatTransactionDate(item.updatedAt),
    };
  });
  return transactions;
};

const dashboardData = async (user, is_admin = false, limit = 20) => {
  const topUsers = await Points.find().sort({ points: -1 }).limit(10).populate('user');

  const userWallet = await Wallet.findOne({
    user: user._id,
  });

  let trxns = [];
  if (is_admin) {
    trxns = await Transaction.find()
      .sort("-createdAt")
      .limit(limit)
      .populate("user", "name email, _id");
    trxns = trxns.map((transaction) => {
      const item = transaction.toObject();
      return {
        ...item,
        createdAt: formatTransactionDate(item.createdAt),
        updatedAt: formatTransactionDate(item.updatedAt),
      };
    });
  } else {
    trxns = await fetchUserTransactions(user._id, limit);
  }  
  
  const userPoints = await Points.findOne({user: user});
  const referrals = await referralModel.findOne({user}).sort("-createdAt");
  const courses = await Course.find().sort("-createdAt");
  const totalPoints = userPoints?.points;
  const referralCommission = referrals?.referralCommission;
  const allRefUsers = referrals?.referredUsers;
  const enrolledCourses = await Course.find({ purchasedBy: user._id }).sort("-createdAt");
  
  // Find the referrer using the referralCode
  const referrer = await referralModel.findOne({ referralCode: user.username });
  let referredUsernames = [];

  if (referrer) {
    // Populate the referredUsers array with user documents
    await referrer.populate('referredUsers');

    // Extract the usernames from the populated referredUsers array
    referredUsernames = referrer.referredUsers.map(user => user.username);
  }

  const user_data = {
    name: user.username,
    email: user.email,
    referredBy: user?.referredBy,
    nextPaymentDate: user.next_PaymentDate ? user.next_PaymentDate.toDateString() : 'N/A' // Format date or show 'N/A'
  };

  const data = {
    user: user_data,
    transactions: trxns,
    totalPoints,
    referralCommission,
    referredUsernames,
    courses,
    topUsers,
    enrolledCourses
  };

  if (userWallet) {
    user_data.balance = userWallet.current_balance;
    data.balance = userWallet.current_balance;
  }
  
  return data;
};


module.exports = {
  dashboardData,
  formatTransaction,
};
