const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/har_ergonomic';

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB] Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    // Retry after 5 seconds
    console.log('[MongoDB] Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected. Attempting reconnect...');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Error: ${err.message}`);
  });
};

module.exports = connectDB;
