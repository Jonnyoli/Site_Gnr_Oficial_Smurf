import mongoose from "mongoose";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI;

export async function connectDB() {
  if (!MONGO_URI) {
    logger.error(
      "❌ MONGO_URI ou MONGODB_URI não está definida no ficheiro .env",
    );

    process.exit(1);
  }

  try {
    mongoose.connection.on("connected", () => {
      logger.info("✅ MongoDB conectado");
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("⚠️ MongoDB desconectado");
    });

    mongoose.connection.on("error", (error) => {
      logger.error(
        {
          name: error?.name,
          message: error?.message,
        },
        "❌ Erro na ligação MongoDB",
      );
    });

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30_000,
      connectTimeoutMS: 30_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
    });

    logger.info(
      {
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
      },
      "✅ Connected to MongoDB from API Server",
    );
  } catch (error: any) {
    logger.error(
      {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        reason: error?.reason,
        cause: error?.cause,
      },
      "❌ MongoDB Connection Error",
    );

    process.exit(1);
  }
}