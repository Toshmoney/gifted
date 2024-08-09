require("dotenv").config();
require("express-async-errors");
const cron = require('node-cron');
const Points = require("./model/Points");
const express = require("express");
const fileupload = require("express-fileupload");
const session = require("express-session");
const multer = require("multer");
// const bodyParser = require("body-parser")
const passport = require("passport");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");

const User = require("./model/User.db");
const connectDB = require("./db/connect");
const notFoundMiddleWare = require("./handleError/notfound");
const errorHandler = require("./handleError/error");

const router = require("./routes/handler");
const powerRoutes = require("./routes/powerRouter");
const examRoutes = require("./routes/examRouter");
const airtimeRoutes = require("./routes/airtimeRoute");
const paypalRoutes = require("./routes/paypalRoute");
const payoneerRoutes = require("./routes/payoneerRoute");
const giftcardRoutes = require("./routes/giftcardRoute")
const cryptoRoutes = require("./routes/crypto")
const dataPlanRoutes = require("./routes/dataPlanRoute");
const tradeRoutes = require("./routes/tradeRoute");
const tvRoutes = require("./routes/tvRouter");
const transactionRoutes = require("./routes/transaction");

const storage = multer.diskStorage({
  destination: './public/images',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

const port = 8080;
const app = express();

// ************** Middleware ****************
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(__dirname + '/uploads'))
app.use(fileupload());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 3600000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("public"));
app.use(express.json());
app.use(flash());
app.use(cookieParser());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ******** Reset all user spins for the next day *********

cron.schedule('0 0 * * *', async () => {
  try {
    //**** Reset the has_spin field for all users ****
    await Points.updateMany({}, { has_spin: false });
    await User.updateMany({}, { has_spin: false });

    const today = new Date();
    const dayOfWeek = today.getDay();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const isLastDayOfMonth = today.getDate() === lastDayOfMonth;

    //**** Clear points for weekly users every Sunday ****
    if (dayOfWeek === 0) {
      await Points.updateMany({ plan_type: 'weekly' }, { points: 0 });
      console.log('Successfully cleared points for weekly users.');
    }

    //**** Clear points for monthly users at the end of the month ****
    if (isLastDayOfMonth) {
      await Points.updateMany({ plan_type: 'monthly' }, { points: 0 });
      console.log('Successfully cleared points for monthly users.');
    }

    console.log('Successfully reset the spin status for all users.');
  } catch (error) {
    console.error('Error during cron job execution:', error);
  }
});


// Manually clear spin
const clearSpin = async()=>{
  try {
    console.log('Cron job started at:', new Date().toISOString());

    //**** Reset the has_spin field for all users ****
    await Points.updateMany({}, { has_spin: false });
    await User.updateMany({}, { has_spin: false });
    console.log('Successfully reset the spin status for all users.');

    const today = new Date();
    const dayOfWeek = today.getDay();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const isLastDayOfMonth = today.getDate() === lastDayOfMonth;

    //**** Clear points for weekly users every Sunday ****
    if (dayOfWeek === 0) {
      await Points.updateMany({ plan_type: 'weekly' }, { points: 0 });
      console.log('Successfully cleared points for weekly users.');
    }

    //**** Clear points for monthly users at the end of the month ****
    if (isLastDayOfMonth) {
      await Points.updateMany({ plan_type: 'monthly' }, { points: 0 });
      console.log('Successfully cleared points for monthly users.');
    }

    console.log('Successfully reset the spin status for all users.');
  } catch (error) {
    console.error('Error during cron job execution:', error);
  }
}

// clearSpin()

// const addPlanTypeToExistingPoints = async () => {
//   const pointsWithoutPlanType = await Points.find({ plan_type: { $exists: false } });

//   for (const point of pointsWithoutPlanType) {
//       const user = await User.findById(point.user); 
//       if (user && user.plan_type) {
//           point.plan_type = user.plan_type;
//           await point.save();
//       } else {
//           console.warn(`User not found or plan_type missing for user ID: ${point.user}`);
//       }
//   }

//   console.log('Plan type added to existing Points documents.');
// };

// addPlanTypeToExistingPoints();


// ********** Routes **************
app.use("/", router);
app.use("/api/v1/data_plan", dataPlanRoutes);
app.use("/api/v1/trade_plan", tradeRoutes);
app.use("/api/v1/airtime", airtimeRoutes);
app.use("/trades", paypalRoutes);
app.use("/trades", payoneerRoutes);
app.use("/trades", giftcardRoutes);
app.use("/trades", cryptoRoutes);
app.use("/api/v1/tv", tvRoutes);
app.use("/api/v1/power", powerRoutes);
app.use("/api/v1/exam", examRoutes);
app.use("/api/v1/transactions", transactionRoutes);

// app.use(notFoundMiddleWare);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB('DB conneced successfully!!');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}...`);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
