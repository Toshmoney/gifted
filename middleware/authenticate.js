const { CustomAPIError } = require("../handleError");

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
  hasPaid
};
