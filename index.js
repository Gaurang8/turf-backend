import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoutes from "./routes/user.route.js";

dotenv.config({});

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sample route
app.get("/", (req, res) => {
  res.send("Backend is running 123");
});

app.use('/api/v1/user', userRoutes);

const corsOption = {
  origin: "http://localhost:3000", // Fixed typo
  credentials: true, // Fixed the property name
};
app.use(cors(corsOption));

// Start the server
app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
