const { CustomAPIError } = require("../handleError");

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.requestedUrl = req.originalUrl;
  const requestedUrl = req.originalUrl || "/dashboard";
  req.flash("info", "your session has expired pls log in");
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

module.exports = {
  isLoggedIn,
  isAdmin,
  isAuthenticated,
};
