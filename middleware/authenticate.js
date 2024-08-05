const { CustomAPIError } = require("../handleError");
const moment = require('moment');

const checkSubscription = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.next_PaymentDate) {
      req.flash("info", "Subscription information is not available");
      return res.redirect("/makePayment")
      // return res.status(403).json({ msg: 'Subscription information is not available' });
    }

    // Check if the current date is past the next_paymentDate
    const nextPaymentDate = moment(user.next_PaymentDate);
    const today = moment();

    if (today.isAfter(nextPaymentDate)) {
      // If subscription has expired
      req.flash("info", "Your subscription has expired. Please renew to continue accessing this resource.");
      return res.redirect("/makePayment")
    }

    // If subscription is still valid
    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};



function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.requestedUrl = req.originalUrl;
  const requestedUrl = req.originalUrl || "/dashboard";
  req.flash("info", "Please login to continue ...");
  res.redirect(`/login?redirect=${requestedUrl}`);
}

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  throw new CustomAPIError("session expired, login to continue", 401);
}

function isAdmin(req, res, next) {
  if (req.user?.isAdmin) {
    return next();
  }
  throw new CustomAPIError("unauthorized user", 403);
}

function hasPaid(req, res, next) {
  if (req.user?.isPaid) {
    return next();
  }
  req.flash("error", "Please make payment to continue ...");
 return res.redirect(`/makePayment`);
}

module.exports = {
  isLoggedIn,
  isAdmin,
  isAuthenticated,
  hasPaid,
  checkSubscription
};
