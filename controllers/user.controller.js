import bcrypt from "bcrypt";
import { User } from "../models/user.model.js"; // Ensure the correct import path
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { name, password, confirmPassword, email, phone } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
        success: false,
      });
    }

    // Validate that either email or phone is provided, but not both
    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({
        message: "Username, password, and either email or phone are required",
        success: false,
      });
    }

    if (email && phone) {
      return res.status(400).json({
        message: "Please provide either an email or a phone number, not both",
        success: false,
      });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(400).json({
        message: "Username is already taken",
        success: false,
      });
    }

    // Check if email or phone is already registered
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          message: "Email is already registered",
          success: false,
        });
      }
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          message: "Phone number is already registered",
          success: false,
        });
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    await User.create({
      name,
      email: email || null,
      phone: phone || null,
      password: hashedPassword,
      role: "user",
    });

    return res.status(201).json({
      message: "Account created successfully, please log in",
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while processing your request",
      success: false,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Validate input
    if (!password || (!email && !phone)) {
      return res.status(400).json({
        message: "Password and either email or phone are required",
        success: false,
      });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found, please register first",
        success: false,
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, // Payload
      process.env.JWT_SECRET, // Secret key (store in .env)
      { expiresIn: "7d" } // Token expiry
    );

    return res.status(200).json({
      message: "Login successful",
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while processing your request",
      success: false,
    });
  }
};
