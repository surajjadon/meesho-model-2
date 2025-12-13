import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // process.env.MONGO_URI comes from your .env file
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI must be defined in your .env file');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Exit process with failure code
    process.exit(1);
  }
};

export default connectDB;