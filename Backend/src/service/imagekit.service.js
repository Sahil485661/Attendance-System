const { ImageKit } = require('@imagekit/nodejs');
require('dotenv').config();

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Compatible upload wrapper:
 * Supports imagekit.upload({ file: Buffer|string, fileName: string, folder: string })
 */
if (!imagekit.upload && imagekit.files?.upload) {
  imagekit.upload = function (options) {
    const uploadPayload = {
      ...options,
      file: Buffer.isBuffer(options.file)
        ? options.file.toString('base64')
        : options.file,
    };
    return imagekit.files.upload(uploadPayload);
  };
}

/**
 * Legacy upload helper function
 */
async function uploadFile(buffer, fileName = `upload_${Date.now()}.jpg`) {
  try {
    const result = await imagekit.upload({
      file: buffer,
      fileName,
    });
    return result;
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw error;
  }
}

module.exports = uploadFile;
module.exports.imagekit = imagekit;