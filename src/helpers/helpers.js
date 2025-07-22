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
// static filterValidUpdates(existingData, inputData, options = {}) {
//     const validUpdates = {};
//     const invalid_fields = [];

//     const existingKeys = Object.keys(existingData);
//     //   console.log(existingKeys)

//     for (const key of Object.keys(inputData)) {
//         if (existingKeys.includes(key)) {
//         // Special handling for JSONB field if needed
//         if (key === 'property_features' && options.parseJSON) {
//             try {
//             const parsed = typeof inputData[key] === 'string'
//                 ? JSON.parse(inputData[key])
//                 : inputData[key];

//             validUpdates[key] = {
//                 ...existingData[key],
//                 ...parsed,
//             };
//             } catch (e) {
//             invalid_fields.push(key);
//             }
//         } else {
//             validUpdates[key] = inputData[key];
//         }
//         } else {
//         invalid_fields.push(key);
//         }
//     }
//     return { validUpdates, invalid_fields };
// }

static filterValidUpdates(existingData, inputData, options = {}) {
  const validUpdates = {};
  const invalid_fields = [];

  const existingKeys = Object.keys(existingData);

  for (const key of Object.keys(inputData)) {
    if (existingKeys.includes(key)) {
      if (key === "property_features" && options.parseJSON) {
        try {
          let rawValue = inputData[key];
          console.log("Received property_features:", rawValue); // Debug log

          // Handle case where property_features is an array
          if (Array.isArray(rawValue)) {
            // Find the first valid JSON string
            rawValue = rawValue.find((val) => typeof val === "string" && val.startsWith("{")) || rawValue[0];
          }

          const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
          console.log("Parsed property_features:", parsed); // Debug log
          if (typeof parsed !== "object" || parsed === null) {
            throw new Error("property_features must be a valid JSON object");
          }
          validUpdates[key] = {
            ...existingData[key],
            ...parsed,
          };
        } catch (e) {
          console.error("Error parsing property_features:", e.message, "Raw value:", inputData[key]);
          invalid_fields.push({ name: key, message: `Invalid JSON format: ${e.message}` });
        }
      } else {
        validUpdates[key] = inputData[key];
      }
    } else {
      invalid_fields.push({ name: key, message: "Field not allowed" });
    }
  }

  return { validUpdates, invalid_fields};
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