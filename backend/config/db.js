import mongoose from 'mongoose';
import dns from 'dns';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/investment-agent';
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' && error.syscall === 'querySrv') {
      console.warn('[DB Config] DNS querySrv error detected. Configuring fallback DNS servers (8.8.8.8, 1.1.1.1) and retrying connection...');
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected (via DNS fallback): ${conn.connection.host}`);
        return;
      } catch (retryError) {
        console.error(`MongoDB Connection Error (after DNS fallback): ${retryError.message}`);
        process.exit(1);
      }
    }
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
