const fsp = require('fs/promises');
const path = require('path');

class Helpers {
    /**
 * Filters and validates update fields against existing DB fields.
 * @param {Object} existingData - The data object fetched from DB.
 * @param {Object} inputData - The incoming update payload (from req.body).
 * @param {Object} options - Extra options (like parseJSON for JSON strings).
 * @returns {Object} - { validUpdates, invalid_fields }
 */
static filterValidUpdates(existingData, inputData, options = {}) {
    const validUpdates = {};
    const invalid_fields = [];

    const existingKeys = Object.keys(existingData);
    //   console.log(existingKeys)

    for (const key of Object.keys(inputData)) {
        if (existingKeys.includes(key)) {
        // Special handling for JSONB field if needed
        if (key === 'property_features' && options.parseJSON) {
            try {
            const parsed = typeof inputData[key] === 'string'
                ? JSON.parse(inputData[key])
                : inputData[key];

            validUpdates[key] = {
                ...existingData[key],
                ...parsed,
            };
            } catch (e) {
            invalid_fields.push(key);
            }
        } else {
            validUpdates[key] = inputData[key];
        }
        } else {
        invalid_fields.push(key);
        }
    }
    return { validUpdates, invalid_fields };
}

static async cleanupUploadedFiles(filenames = [], folderPath) {
  await Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(folderPath, filename);
      try {
        await fsp.unlink(filePath);
      } catch (err) {
        console.warn(`Could not delete file ${filePath}:`, err.message);
      }
    })
  );
}

}

module.exports = Helpers