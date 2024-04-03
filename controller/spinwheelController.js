const Points = require('../model/Points');


const spintheWheel = async (req, res)=>{
    const {score} = req.body;
    const user = req.user

    try {
        const userPoints = await Points.findOne({user:user._id})
      
        if(!userPoints){
            const newPoint = new Points({
                points:10,
                user
            })
            newPoint
            .save()
            .then()
            .catch((error)=>{
                next(error);
            });
        }
        userPoints.points += score;
        userPoints.save()
        .then(()=>{
            res.json({msg: 'points added successfully', userPoints})
        })
        .catch((error)=>{
            next(error);
        });
    } catch (error) {
        console.error(error)
        return res.status(500).json({msg: 'internal server error'})
    }
}


module.exports = spintheWheel