import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blogapp');
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    const username = process.argv[3];
    const password = process.argv[4];

    if (!email || !username || !password) {
      console.error('Usage: node createAdmin.js <email> <username> <password>');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log('User already exists and is already an admin');
        process.exit(0);
      }
      
      // Update existing user to admin
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('User updated to admin:', username);
      process.exit(0);
    }

    // Create new admin user
    const admin = new User({
      username,
      email,
      password,
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully:', username);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

createAdmin();









