require("dotenv").config();
const { fetchPrices, generateTransId } = require("../utils");
const Transaction = require("../model/Transaction");
const { default: axios } = require("axios");
const Trades = require("../model/Trades");
const nodemailer = require("nodemailer");

const baseurl = process.env.BASE_URL

const buyPaypal = async (req, res) => {
  const {email, full_name, currency, service_id} = req.body;
  let amount = req.body.amount;
  const trade = await fetch(`/api/v1/trade_plan/${service_id}`).then(res => res.json())
  let details = await trade.data
  const trade_type = details.trade_type
  const buyPrice = details.dollar_buy_price;
  const user = req.user;
  const userWallet = req.user.wallet;
  const userBalance = userWallet.current_balance;
  amount = Number(amount * buyPrice);

  if (userBalance < Number(amount)){
    // req.flash('error', 'Insufficient funds!')
    // return  res.redirect('/trades/paypal')
    res.json({"error": "Insufficient Funds in user wallet!"})
  }else{
  // create a unique transaction_id
  let transaction_id;
  while (true) {
    transaction_id = generateTransId();
    const existingTrans = await Transaction.findOne({
      reference_number: transaction_id,
    });
    if (!existingTrans) {
      break;
    }
  }
  // create transaction with pending status
  const transaction = new Transaction({
    user: user._id,
    amount: amount,
    balance_before: userBalance,
    balance_after: userBalance,
    status: "pending",
    service: "paypal",
    type: "debit",
    description: `NGN${amount} worth of paypal funds purchased`,
    reference_number: transaction_id,
  });
  
  // send request to server
  try {
   const purchasedtrade = await Trades.create({
    user,
    amount,
    full_name,
    currency,
    service_id,
    trade_type,
    trans_id: transaction_id,
   });
   if(!purchasedtrade){
    re.flash({message: "Error while purchasing paypal funds"})
   }
    // update transaction to be concluded
    transaction.status = "completed";
    transaction.balance_after = userBalance - Number(amount);
    // deduct transaction amount from user wallet
    userWallet.previous_balance = userBalance;
    userWallet.current_balance = userBalance - Number(amount);
    await userWallet.save();
    await transaction.save();
    res.status(202).json({
      message: "transaction is being processed",
      balance: userWallet.current_balance,
      success: true,
    });
  } catch (error) {
    transaction.status = "failed"
    return res.status(422).json({
      message: "failed transaction",
      success: false,
    });
  }
}
};

const sellPaypal = async (req, res) => {
  let imageUploadFile;
    let uploadPath;
    let newImageName;

    if(!req.files || Object.keys(req.files).length === 0){
      req.flash("error", "Payment screenshot is missing!");
      return;
    } else {

      imageUploadFile = req.files.proof;
      newImageName = Date.now() + imageUploadFile.name;

      uploadPath = require('path').resolve('./') + '/public/uploads/' + newImageName;


      imageUploadFile.mv(uploadPath, function(err){
        if(err){
          req.flash("error", err);
        }
      })
    }

  const {trans_id, currency, service_id, email} = req.body

  console.log(newImageName);

  let amount = req.body.amount;
  if(Number(amount < 50)){
    req.flash("error", "We don't buy paypal funds that is lesser than $50");
    return res.redirect("/trades/paypal");
  }
  const trade = await fetch(`${baseurl}/api/v1/trade_plan/${service_id}`).then(res => res.json())
  let details = await trade.data
  const trade_type = details?.trade_type || "paypal"
  const sellPrice = details.dollar_sell_price;
  const user = req.user;
  const userWallet = req.user.wallet;
  const userBalance = userWallet.current_balance;
  amount = Number(amount * sellPrice);
  // create a unique transaction_id
  let transaction_id;
  while (true) {
    transaction_id = generateTransId();
    const existingTrans = await Transaction.findOne({
      reference_number: transaction_id,
    });
    if (!existingTrans) {
      break;
    }
  }
  // create transaction with pending status
  const transaction = new Transaction({
    user: user._id,
    amount: amount,
    balance_before: userBalance,
    balance_after: userBalance,
    status: "pending",
    service: "paypal",
    type: "credit",
    description: `NGN${amount} worth of paypal ${service_id} funds sold!`,
    reference_number: trans_id,
    external_id:email,
    proof:newImageName
  });
 
  // send request to server
  try {
   const soldTrade = await Trades.create({
    user,
    amount,
    trans_id,
    currency,
    service_id,
    trade_type,
    proof: newImageName,
   });
   if(!soldTrade){
    // res.json({message: "Error while purchasing paypal funds"})
    req.flash("error", "Error while purchasing paypal funds")
    return res.redirect("/trades/paypal")
   }

   // Use Nodemailer to notify admin via email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: 'info@paytonaira.com',
    subject: "New Trade awaiting Approval",
    text: `Dear admin, a new trade of NGN${amount} was done and is waiting for your approval!`,
  };

  transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.log(err);
        req.flash("error", "Error while sending Notification to user");
        return res.redirect("/admin");
      }
    });
    
    // update transaction to be concluded
    transaction.status = "review";
    transaction.balance_after = userBalance;
    // deduct transaction amount from user wallet
    userWallet.previous_balance = userBalance;
    userWallet.current_balance = userBalance;
    await userWallet.save();
    await transaction.save();
    req.flash("info", "Transaction is being processed")
    return res.redirect("/trades/paypal")
  } catch (error) {
    transaction.status = "failed"
    req.flash("error", error)
    return res.redirect("/trades/paypal")
  }
};


module.exports = {
  buyPaypal,
  sellPaypal
};
