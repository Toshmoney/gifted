const Points = require('../model/Points');
const Transaction = require('../model/Transaction');


const spintheWheel = async (req, res, next) => {
    const { score } = req.body;
    const user = req.user;

    try {
        let userPoints = await Points.findOne({ user: user._id });

        let transactionDescription = "";

        if (!userPoints) {
            userPoints = new Points({
                points: 10,
                user: user._id,
            });
            transactionDescription = `Initial points for new user: 10 points added`;
        } else {
            userPoints.points += score;
            transactionDescription = `${score} points from spinning the wheel`;
        }

        await userPoints.save();

        await Transaction.create({
            user: user._id,
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