const express = require("express");
const passport = require("passport");
const router = express.Router();
const {
  homePage,
  dashboard,
  airtime,
  dataplan,
  billpayment,
  wallet,
  fundWallet,
  setting,
  profile,
  verifyNow,
  billPayer,
  privacyPolicy,
  businessBal,
  tradeService,
  trades,
  aboutPage,
  blog,
  contact,
  support,
  termsCondition,
  walletWithdraw,
  getQuiz,
  submitQuiz,
  createQuiz,
  adminPostQuiz,
  getNewQuiz,
  spinNow,
  spin,
  createCourses,
  quizPage,
  referral,
  convertRef,
  transferToFriends,
  sendToFriends,
  quiz,
  deleteQuestion,
  getEditQuestion,
  postEditQuestion,
  adminGetAllQuiz,
  adminLeaderboard,
  adminGetAllCourses,
  getEditCourse,
  postEditCourse,
  weeklyQuizUser,
  getAllEnrolledUser,
} = require("../controller/controller");

const {
  adminDashboard,
  adminTrans,
  allUsers,
  adminSettings,
  adminDataPlans,
  adminDataReset,
  adminCableReset,
  adminExamReset,
  adminElectricityReset,
  allTrades,
  approveTrades,
  createPost,
  getSinglePost,
  getAllPost,
  editSinglePost,
  deletePost,
  deleteAllPost,
  adminTradeReset,
  adminTradePlans,
  rejectTrades,
  adminManualFunding,
  makeUserAdmin,
  assignAdminRole,
  turnAdminToUser,
  revertAdminRole,
  adminRewardFunding,

} = require("../controller/admin");

const { fetchPackages } = require("../controller/packageController");

const { isLoggedIn, isAdmin, hasPaid, checkSubscription, checkSpinAvailability, quizAccessControl } = require("../middleware/authenticate");

const {
  newUser,
  signUpPage,
  logInPage,
  logout,
  forgotPassword,
  confirmReset,
  confirmPass,
  getPasswordUpdatedPage,
  updatePassword,
  makePayment,
  confirmPayment,
} = require("../controller/auth");

const fundWalletVerify = require("../controller/fundWallet");

const { newPin, updatePin } = require("../controller/transactionPin");
const { checkUserPin, verifyUserPin } = require("../middleware/checkUserPin");
const { withdrawalRequest, fetchsupportbanks } = require("../controller/withdrawFunds");
const addFundsManually = require("../controller/addFundManually");
const { getCourse, CourseWalletpurchase, CoursePointpurchase, checkEnrolledUser, updateCourse, getAllCourse, createCourse, myCourses } = require("../controller/courseController");
const spintheWheel = require("../controller/spinwheelController");
const rewardTopQuizer = require("../controller/rewardTopQuizer");

// const { buyPaypal } = require("../controller/paypalController");

router.route("/api/v1/packages").post(fetchPackages);
router.route("/").get(homePage);

router.route("/about-us").get(aboutPage)
router.route("/blog").get(blog)
router.route("/support").get(support)
router.route("/contact").get(contact)
router.route("/privacy").get(privacyPolicy)
router.route("/terms-condition").get(termsCondition)



router.route("/banks/get-bank-details").get(fetchsupportbanks)
router.route("/login").get(logInPage);
router.route("/login").post((req, res, next) => {
  const redirectUrl = req.session.requestedUrl || "/dashboard";
  passport.authenticate("local", {
    successRedirect: redirectUrl,
    failureRedirect: "/login",
    failureFlash: "Incorrect credientials",
    failureMessage: true,
  })(req, res, next);
});
router.route("/logout").get(logout);
router.route("/sign-up").get(signUpPage);
router.route("/forgot-password").get(forgotPassword);
router.route("/forgot-password").post(forgotPassword);
router.route("/confirmation").get(confirmPass);
router.route("/confirmation").post(confirmReset);
router.route("/reset-password/:token").get(getPasswordUpdatedPage);
router.route("/reset-password/:token").post(updatePassword);
router.route("/sign-up").post(newUser);
router.route("/dashboard").get([isLoggedIn, hasPaid], dashboard);
router.route("/dashboard").post(dashboard);
router.route("/airtime").get([isLoggedIn, checkUserPin], airtime);
router.route("/data").get([isLoggedIn, checkUserPin], dataplan);
router.route("/billpayment").get([isLoggedIn, checkUserPin], billpayment);
router.route("/trades").get([isLoggedIn, checkUserPin], trades);

// Quiz
router.route("/quiz/take-quiz").get([isLoggedIn, quizAccessControl], getQuiz);
router.route("/no-new-quiz-available").get([isLoggedIn], quiz);
router.route("/weekly-user-quiz-check").get([isLoggedIn], weeklyQuizUser);
router.route("/quiz").get([isLoggedIn], quizPage);
router.route("/quiz/submit-quiz").post([isLoggedIn], submitQuiz);
router.route("/quiz/next-question").get([isLoggedIn], getNewQuiz);

// Referral
router.route("/referral").get([isLoggedIn], referral)
router.route("/referral/convert").get([isLoggedIn], convertRef)
router
  .route("/billpayment/:service")
  .get([isLoggedIn, checkUserPin], billPayer);

  router
  .route("/trades/:service")
  .get([isLoggedIn, checkUserPin], tradeService);
router.route("/wallet").get(isLoggedIn, wallet);
router.route("/wallet/withdraw").post([isLoggedIn, checkUserPin], withdrawalRequest)
router.route("/wallet/fund").get(isLoggedIn, fundWallet);
// withdrawal page that authenticate user bank
router.route("/wallet/withdraw").get([isLoggedIn, checkUserPin], walletWithdraw);
router.route("/setting").get(isLoggedIn, setting);
router.route("/profile").get(isLoggedIn, profile);
router.route("/privacy-policy").get(isLoggedIn, privacyPolicy);
router.route("/verify_now").get(isLoggedIn, verifyNow);
router.route("/wallet/verify-payment").post(isLoggedIn, fundWalletVerify);
router.route("/wallet/fund-manual").post([isLoggedIn, isAdmin], addFundsManually);

// Spin only
router.route('/spin-wheel').get([isLoggedIn, checkSubscription, checkSpinAvailability, quizAccessControl],spinNow)
router.route('/spin-wheel').post([isLoggedIn, checkSubscription, checkSpinAvailability],spintheWheel)
router.route('/spin').get([isLoggedIn, checkSubscription],spin);

// Course Only;
router.route('/all-available-courses').get([isLoggedIn],getAllCourse);
router.route("/course/:courseId").get([isLoggedIn, checkSubscription], getCourse)
router.route("/course-wallet-purchase/:courseId").post([isLoggedIn, checkSubscription], CourseWalletpurchase)
router.route("/course-point-purchase/:courseId").post([isLoggedIn, checkSubscription], CoursePointpurchase)
router.route("/course-purchased-user/:courseId").get([isLoggedIn], checkEnrolledUser)
router.route("/delete-course/:courseId").delete([isLoggedIn, isAdmin], checkEnrolledUser)
router.route("/update-course/:courseId").get([isLoggedIn, isAdmin], updateCourse)
router.route("/create-course").get([isLoggedIn, isAdmin], createCourses)
router.route("/create-course").post([isLoggedIn, isAdmin], createCourse)
router.route("/my-courses").get(isLoggedIn, myCourses)
router.route("/transfer-to-friends").post([isLoggedIn], transferToFriends);
router.route("/transfer-to-friends").get([isLoggedIn], sendToFriends);




// router.route("/trades/paypal").post(isLoggedIn, buyPaypal)

// Admin only
router.route("/admin").get([isLoggedIn, isAdmin], adminDashboard);
router.route("/quiz/admin-post").get([isLoggedIn, isAdmin], adminPostQuiz);
router.route("/quiz/post-question").post([isLoggedIn, isAdmin], createQuiz);
router.route("/admin/quiz/questions").get([isLoggedIn, isAdmin], adminGetAllQuiz);
router.route("/admin/courses/:courseId/enrolled-users").get([isLoggedIn, isAdmin], getAllEnrolledUser);
router.route("/admin/all-courses").get([isLoggedIn, isAdmin], adminGetAllCourses);
router.route("/admin/courses/edit/:id").get([isLoggedIn, isAdmin], getEditCourse);
router.route("/admin/courses/edit/:id").post([isLoggedIn, isAdmin], postEditCourse);
router.route("/admin/leaderboard").get([isLoggedIn, isAdmin], adminLeaderboard);
router.route("/admin/quiz/questions/delete/:id").get([isLoggedIn, isAdmin], deleteQuestion);
router.route("/admin/quiz/questions/edit/:id").get([isLoggedIn, isAdmin], getEditQuestion);
router.route("/admin/quiz/questions/edit/:id").post([isLoggedIn, isAdmin], postEditQuestion);
router.route('/makePayment').get([isLoggedIn],makePayment)
router.route('/confirm-payment').post([isLoggedIn],confirmPayment)
router.route("/manual/funding").get([isLoggedIn, isAdmin], adminManualFunding);
router.route("/manual/quiz-reward").get([isLoggedIn, isAdmin], adminRewardFunding);
router.route("/role/make-admin").get([isLoggedIn, isAdmin], makeUserAdmin);
router.route("/role/make-admin").post([isLoggedIn, isAdmin], assignAdminRole);
router.route("/role/turn-to-user").get([isLoggedIn, isAdmin], revertAdminRole);
router.route("/role/turn-to-user").post([isLoggedIn, isAdmin], turnAdminToUser);
router.route("/manual/funding").post([isLoggedIn, isAdmin], addFundsManually);
router.route("/manual/quiz-reward").post([isLoggedIn, isAdmin], rewardTopQuizer);
router.route("/trades/reject/:id").post([isLoggedIn, isAdmin], rejectTrades);
router.route("/users/all-users").get([isLoggedIn, isAdmin], allUsers);
router.route("/admin/setting").get([isLoggedIn, isAdmin], adminSettings);
router.route("/transactions/all").get([isLoggedIn, isAdmin], adminTrans);
router
  .route("/data-plans/:plan_id/change")
  .get([isLoggedIn, isAdmin], adminDataReset);
router
  .route("/trades/:service_id/change")
  .get([isLoggedIn, isAdmin], adminTradeReset);
router.route("/admin/tv-reset").get([isLoggedIn, isAdmin], adminCableReset);
router.route("/admin/exam-reset").get([isLoggedIn, isAdmin], adminExamReset);
router
  .route("/admin/electricity-reset")
  .get([isLoggedIn, isAdmin], adminElectricityReset);
router.route("/admin/data-plans").get([isLoggedIn, isAdmin], adminDataPlans);
router.route("/admin/trade-plans").get([isLoggedIn, isAdmin], adminTradePlans);

// transaction pain
router.route("/new/pin").get([isLoggedIn], newPin).post([isLoggedIn], newPin);
router
  .route("/update/pin")
  .get([isLoggedIn], updatePin)
  .post([isLoggedIn], updatePin);

module.exports = router;
