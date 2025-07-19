const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const {CustomError} = require('../libraries/custom_error')
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destinationFolder;
    switch (file.fieldname) {
      case 'profile_pics':
        destinationFolder = 'public/assets/profile_pics';
        break;
      case 'images':
        destinationFolder = 'public/uploads/images';
        break;
      default:
        cb(
            new CustomError({ 
                name: 'Multer', 
                message: 'Invalid file fieldname',
                details:{},
             })
        );
        return;
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(destinationFolder)) {
      fs.mkdirSync(destinationFolder, { recursive: true });
    }

    cb(null, destinationFolder);
  },

  filename: (req, file, cb) => {
    const uuid = uuidv4();
    const extension = path.extname(file.originalname)
    cb(null, `${uuid}${extension}`)

  },
  
});


const fileFilter = (req, file, cb) => {
  if (
    file.fieldname === "images" &&
    !file.mimetype.startsWith("image/")
  ) {
    return cb(
      new CustomError({
        name: "MulterFileError",
        message: "Only image files are allowed",
        statusCode: 400,
        details: {},
      })
    );
  }

  cb(null, true);
};


const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  }
});

const fileUpload = upload.fields([
  {name:"images", maxCount: 10},
  {name:"profile_pics", maxCount: 1}]);
 
module.exports = {fileUpload,}
