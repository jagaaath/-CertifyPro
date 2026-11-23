// ============================================
// Cloudinary Configuration
// Sets up the Cloudinary SDK with credentials
// from environment variables
// ============================================

const cloudinary = require("cloudinary").v2;

// ─────────────────────────────────────────────
// Configure Cloudinary using credentials stored
// in .env — never hardcode these values
// ─────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY,       // Your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Your Cloudinary API secret
});

// Export the configured cloudinary instance
// This will be used in the upload middleware
module.exports = cloudinary;