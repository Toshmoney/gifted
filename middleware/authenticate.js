const { CustomAPIError } = require("../handleError");
const moment = require('moment');
const Points = require("../model/Points");

const checkSubscription = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.next_PaymentDate) {
      req.flash("info", "Subscription information is not available");
      return res.redirect("/makePayment")
    }

    const nextPaymentDate = moment(user.next_PaymentDate);
    const today = moment();

    if (today.isAfter(nextPaymentDate)) {
      req.flash("info", "Your subscription has expired. Please renew to continue accessing this resource.");
      return res.redirect("/makePayment")
    }

    next();
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};

const quizAccessControl = (req, res, next) => {
    const user = req.user;
    // Get current day e.g Monday with moment
    const currentDay = moment().format('dddd');

    if (user.plan_type === 'weekly') {

        // Restrict access on Saturday and Sunday
        if (currentDay === 'Saturday' || currentDay === 'Sunday') {
          return res.redirect('/weekly-user-quiz-check');
        }
    }

    next();
};


const checkSpinAvailability = async (req, res, next) => {
  try {
      const userPoints = await Points.findOne({ user: req.user._id });

      if (userPoints) {
          const lastSpinDate = userPoints.lastSpinDate;
          const today = moment().startOf('day');

          if (lastSpinDate && moment(lastSpinDate).isSame(today, 'day')) {
              req.flash("info", "You have already spun the wheel today. Please try again tomorrow.")
              return res.redirect("/dashboard")
          }
      }

      next();
  } catch (error) {
      console.error("Error checking spin availability:", error);
      return res.status(500).json({ msg: "Internal server error." });
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
  checkSubscription,
  checkSpinAvailability,
  quizAccessControl
};
