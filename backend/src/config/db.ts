import mongoose from 'mongoose';

const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI!);

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return; // Success! Exit the loop.

    } catch (error: any) {
      retries++;
      console.error(`❌ MongoDB Connection Failed (Attempt ${retries}/${MAX_RETRIES}):`, error.message);

      if (retries >= MAX_RETRIES) {
        console.error('💥 Max retries reached. Exiting application...');
        process.exit(1);
      }

      // Wait 5 seconds before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

export default connectDB;