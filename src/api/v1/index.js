const express = require('express')
const router = express.Router();
const handleError = require('../../middlewares/handle_errors');
const Account = require('../../controllers/account');
const Property = require('../../controllers/property')
const Auth = require('../../middlewares/auth');
const Chats = require('../../controllers/chats')
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

router.post('/update-account',
    Auth.verifyToken,
    Auth.authentication,
    fileUpload,
    Account.updateAccount,
)

router.delete('/account/delete-profile-pics',
    Auth.verifyToken,
    Auth.authentication,
    Account.removeProfilePics
)

router.post('/account/change-password',
    Auth.verifyToken,
    Auth.authentication,
    Account.changePassword
)

//chats

router.get('/chat',
    Auth.verifyToken,
    Auth.authentication,
    Chats.getChatById
)

router.get('/chat-request',
    Auth.verifyToken,
    Auth.authentication,
    Chats.getMyChatRequest
)

//properties

//submit ads response for property
router.post('/ad-response',
    Property.propertyAdsResponse
)

router.get('/all-ads-response',
    Auth.verifyToken,
    Auth.authentication,
    Auth.authorization(['admin'], ['read:admin-only'], 'ads_response'),
    Property.getAllAdsResponse
)

router.delete('/ads-response/:id',
    Auth.verifyToken,
    Auth.authentication,
    Auth.authorization(['admin'], ['delete:any'], 'ads_response'),
    Property.deleteAdsResponse
)

//upload property
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

router.get('/my-property',
    Auth.verifyToken,
    Auth.authentication,
    Property.getMyProperties
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

