const Points = require('../model/Points');
const Transaction = require('../model/Transaction');
// const User = require('../model/User.db');

const spintheWheel = async (req, res, next) => {
    const { score } = req.body;
    const user = req.user;

    try {
        if (user.has_spin) {
            return res.status(400).json({ msg: 'You have already spun the wheel today. Try again tomorrow.' });
        }

        let userPoints = await Points.findOne({ user: user._id });
        let transactionDescription = "";

        if (!userPoints) {
            userPoints = new Points({
                points: 10,
                user: user._id,
                lastSpinDate: new Date(),
                has_spin: true  
            });
            transactionDescription = `Initial points for new user: 10 points added`;
        } else {
            userPoints.points += score;
            userPoints.lastSpinDate = new Date();
            userPoints.has_spin = true; 
            transactionDescription = `${score} points from spinning the wheel`;
        }

        await userPoints.save();

        user.has_spin = true;
        await user.save();

        await Transaction.create({
            user: user,
            amount: score,
            service: "spin",
            type: "credit",
            status: "completed",
            description: transactionDescription,
        });

        res.json({ msg: 'Points added successfully', userPoints });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

module.exports = spintheWheel