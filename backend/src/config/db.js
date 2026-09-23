import mongoose from "mongoose";

/**
 * Connects to MongoDB database using MONGODB_URI environment variable.
 * Gracefully logs status without crashing the process on initial connection failure.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/airfare_index";

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn("[MongoDB] Running in offline/disconnected mode. Database operations will fail until MongoDB is available.");
  }
};
