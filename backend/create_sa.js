const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;
    if (!email || !password || password.length < 12) {
      throw new Error('Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD (12+ characters) in the environment first.');
    }
    
    let user = await User.findOne({ email });
    if (user) {
      console.log('SuperAdmin already exists');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      user = await User.create({
        name: 'Super Admin',
        email,
        password: hash,
        role: 'super_admin',
        college: 'System'
      });
      console.log('SuperAdmin created successfully');
    }
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createSuperAdmin();
