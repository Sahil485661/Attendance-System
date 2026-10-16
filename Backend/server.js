require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/database/db');

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    // Server running on production port
  });
});