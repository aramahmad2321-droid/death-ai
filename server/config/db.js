/**
 * Zana AI — MongoDB Connection
 */

'use strict';

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zana-ai';
  
  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
      setTimeout(() => connectDB(), 5000);
    });

  } catch (error) {
    console.warn('⚠️  MongoDB connection warning:', error.message);
    console.warn('⚠️  Server will continue running. (Add MONGODB_URI to persist data to cloud database)');
  }
};

module.exports = connectDB;
