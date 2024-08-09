// const upload = require("../MiddleWare/handleFile");
// const UserModel = require("../model/User");
const Wallet = require("../model/Wallet")
const Transaction = require("../model/Transaction");
const Points = require("../model/Points");
const { dashboardData } = require("../utils");
const Course = require("../model/Course");

const createCourse = async (req, res) => {
    const { title, price, point, courseLink, courseDetails } = req.body;

    try {
        if (!title || !price || !point) {
            req.flash("error", "All fields are required");
            return res.status(400).json({ error: 'All fields are required' });
        }

        let linkArray = [];
        if (courseLink) {
            linkArray = courseLink.split(',');
        }

        const newCourse = await Course.create({
            title,
            price,
            point,
            courseDetails,
            courseLink: linkArray
        });

        if (newCourse) {
            res.status(201).json({ message: "New Course Created", newCourse, success:true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


const getAllCourse =  async(req, res) =>{
    try {
        const errorMg = req.flash("error").join(" ");
        const infoMg = req.flash("info").join(" ");
        const messages = {
          error: errorMg,
          info: infoMg,
        };

        const data = await dashboardData(req?.user)
        console.log({data:data.courses});
        
        res.render("dashboard/courses", {data, messages});
      } catch (error) {
        res.status(500).json({ error: "Failed To Fetch All Course" });
      }
}

const getCourse = async(req, res) => {
    try {

        const user = req.user;
    
        if (!user) {
            req.flash("error", 'You need to login to continue');
            return res.redirect('/login');
        }

        const { courseId } = req.params;
        const course = await Course.findById(courseId);
    
        if (!course) {
            req.flash("error", 'Course not found');
            return res.redirect('/dashboard');
        }
    
        if (!course.purchasedBy.includes(user._id)) {
            req.flash("error", 'Course not purchased by this user');
            return res.redirect('/all-available-courses');
        }

        const user_data = {
            name: user.username,
            email: user.email,
            referredBy: user?.referredBy
          };

        const data = {
            user: user_data,
            name: req.user.username,
            course
        }
    
        req.flash("info", 'Access granted to the course');
        return res.render("dashboard/courseclass", data);
    } catch (error) {
        req.flash("error", 'Internal Server Error');
        return res.status(500).send('Internal Server Error');
    }
}



const updateCourse = async(req, res)=>{
    try {
        const {courseId} = req.params;
        const upCourse = req.body;

        const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            upCourse,
            {new:true, runValidators: true}
        );
        if(!updatedCourse) return res.status(404).json({msg: "Course not found"})

        req.flash("info", "Course updated successfully")
        return;
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal Server error"})
    }
}



const deleteCourse = async(req, res)=>{
    try {
        const {courseId} = req.params
        const deletedCourse = await Product.findByIdAndDelete(courseId)
        if (!deletedCourse){
            return res.status(404).json({error: 'Course not found', success: false});
        }
        return res.json({message: "Course deleted", business: deletedCourse, success: true});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Server Error", success: false})
    }
}

// Purchase course with available funds
const CourseWalletpurchase = async(req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        const user = req.user._id;

        if (!course) {
            req.flash("error", 'Course not found');
            return res.redirect('/all-available-courses');
        }

        if (course.purchasedBy.includes(user)) {
            req.flash("error", 'Course already purchased by this user');
            return res.redirect(`/all-available-courses`);
        }

        const course_price = course.price;

        // Deduct amount from user wallet

        let wallet = await Wallet.findOne({ user }) || new Wallet({ user, current_balance: 0, previous_balance: 0 });
        const userBalance = wallet.current_balance;

        if (userBalance < Number(course_price)) {
            req.flash("error", "Insufficient funds to purchase course");
            return res.redirect('/all-available-courses');
        }

        const transaction = new Transaction({
            user: user,
            old_balance: wallet.previous_balance,
            new_balance: wallet.current_balance,
            amount: course_price,
            type: 'debit',
            status: 'completed',
            description: `${course.title} purchased`,
            reference: "CoursePurchased" + user,
        });

        const amount_paid = Number(course_price);
        wallet.current_balance = userBalance;
        wallet.current_balance = userBalance - amount_paid;
        course.purchasedBy.push(user);

        // Save wallet, transaction, and course
        await wallet.save();
        await transaction.save();
        await course.save();

        req.flash("info", 'Course purchased successfully');
        return res.redirect(`/my-courses`);
    } catch (error) {
        console.error(error);
        req.flash("error", 'Internal Server Error');
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


// Purchase course with available points

const CoursePointpurchase = async(req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        const user = req.user._id;

        if (!course) {
            req.flash("error", 'Course not found');
            return res.redirect('/all-available-courses');
        }

        if (course.purchasedBy.includes(user)) {
            req.flash("error", "You already purchased this course, visit classroom to access it.");
            return res.redirect('/all-available-courses');
        }

        const course_access_point = course.point;

        let point = await Points.findOne({ user }) || new Points({ user, points: 0 });
        const userPoints = point.points;

        if (Number(userPoints) < Number(course_access_point)) {
            req.flash("error", "Insufficient points to purchase course");
            return res.redirect('/all-available-courses');
        }

        const transaction = new Transaction({
            user: user,
            old_balance: userPoints,
            new_balance: userPoints - course_access_point,
            amount: course_access_point,
            type: 'debit',
            status: 'completed',
            description: `Course purchased with ${course_access_point} points`,
            reference: "Course Purchased" + user,
        });

        const pointUsed = Number(course_access_point)
        point.points = userPoints - pointUsed;
        course.purchasedBy.push(user);

        // Save points, transaction, and course
        await point.save();
        await transaction.save();
        await course.save();

        req.flash("info", 'Course purchased successfully');
        return res.redirect(`/my-courses`);
    } catch (error) {
        console.error(error);
        req.flash("error", 'Internal Server Error');
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


// check enrolled users (admin only)
const checkEnrolledUser = async(req, res)=>{
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId).populate('purchasedBy', 'username');
    
        if (!course) {
          req.flash("error", 'Course not found');
          return;
        }
    
        const enrolledUsers = course.purchasedBy.map(user => user.username);
    
        res.json({ enrolledUsers });
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
}

// Route to check all enroled courses (for users)

const myCourses = async(req, res)=>{
    try {
        const data = await dashboardData(req.user);
        res.render('dashboard/enrolledcourses', data);
    } catch (error) {
        console.error(error);
        // req.flash("error", 'Internal Server Error');
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    createCourse,
    getAllCourse,
    getCourse,
    updateCourse,
    deleteCourse,
    checkEnrolledUser,
    CoursePointpurchase,
    CourseWalletpurchase,
    myCourses
}