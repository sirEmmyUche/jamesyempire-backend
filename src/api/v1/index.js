const express = require('express')
const router = express.Router();
const handleError = require('../../middlewares/handle_errors');
const Account = require('../../controllers/account');
const Property = require('../../controllers/property')
const Auth = require('../../middlewares/auth');
const {fileUpload} = require('../../middlewares/use_multer');



router.use(express.json());
// parse application/x-www-form-urlencoded
router.use(express.urlencoded({extended: false}));

//define all routes here

//accounts
router.post('/create-account',
    Account.createAccount
)

router.post('/login',
    Account.login
)

//properties

router.post('/upload-property',
    Auth.verifyToken,
    Auth.authentication,
    Auth.authorization(['admin', 'agent'], ['create:own'], 'property'),
    fileUpload,
    Property.uploadNewProperty
);
// get all properties
router.get('/property',
    Property.getAllProperties
)
//get a single property by id
router.get('/property/:id',
    Property.getPropertyById
)

//search property
router.get('/search-property',
    Property.searchProperties
)

//update a property
router.put('/update-property/:id',
    Auth.verifyToken,
    Auth.authentication,
    Auth.authorization(['admin','agent'],['update:own'],'property'),
    fileUpload,
    Property.updateProperty
)

router.delete('/remove-image-from-property-image/:id',
    Auth.verifyToken,
    Auth.authentication,
    Auth.authorization(['admin', 'agent'], ['delete:any', 'delete:own'], 'property'),
    Property.deleteImageFromPropertyImage
)

router.delete('/remove-property/:id',
    Auth.verifyToken,
    Auth.authentication,
    Auth.authorization(['admin', 'agent'], ['delete:any', 'delete:own'], 'property'),
    Property.deletePropertyById
);


router.use(handleError);

module.exports = router;

