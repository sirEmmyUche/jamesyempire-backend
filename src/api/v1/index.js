const express = require('express')
const router = express.Router();
const handleError = require('../../middlewares/handle_errors')



router.use(express.json());
// parse application/x-www-form-urlencoded
router.use(express.urlencoded({extended: false}));

//define all routes here

router.use(handleError);

module.exports = router;

