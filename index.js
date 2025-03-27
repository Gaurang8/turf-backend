import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoutes from "./routes/user.route.js";

dotenv.config({});

const app = express();

const PORT = process.env.PORT || 5000;

// CORS Middleware (Move this to the top before routes)
app.use(cors({
  origin: "*", // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
}));

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sample route
app.get("/", (req, res) => {
  res.send("Backend is running 123");
});

app.use('/api/v1/user', userRoutes);

// Start the server
app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
