const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set — add it to documind-backend/.env (see .env.example)');
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✓ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Tip: check MONGODB_URI, IP allowlist, and network.');
    process.exit(1);
  }
};

module.exports = connectDB;
