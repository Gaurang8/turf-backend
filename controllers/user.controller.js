import bcrypt from "bcrypt";
import { User } from "../models/user.model.js"; // Ensure the correct import path
import jwt from "jsonwebtoken";
import { OTP } from "../models/otp.model.js";
import crypto from "crypto";
import Appointment from '../models/appointment.model.js';

export const register = async (req, res) => {
  try {
    const { name, password, confirmPassword, type, value } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
        success: false,
      });
    }

    // Validate required fields
    if (!name || !password || !type || !value) {
      return res.status(400).json({
        message: "Username, password, type, and value are required",
        success: false,
      });
    }

    // Validate type
    if (type !== "email" && type !== "phone") {
      return res.status(400).json({
        message: "Invalid type. Type must be either 'email' or 'phone'",
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
    const existingValue = await User.findOne({ [type]: value });
    if (existingValue) {
      return res.status(400).json({
        message: `${type} is already registered`,
        success: false,
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = await User.create({
      name,
      [type]: value, // Dynamically assign email or phone
      password: hashedPassword,
      role: "user",
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Account created successfully",
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email || null,
        phone: newUser.phone || null,
        role: newUser.role,
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


export const login = async (req, res) => {
  try {
    const { value, password } = req.body;

    // Validate input
    if (!value || !password) {
      return res.status(400).json({
        message: "Both value (email or phone) and password are required",
        success: false,
      });
    }

    console.log(value)
    // Find user by checking both email and phone fields
    const user = await User.findOne({
      $or: [{ email: value }, { phone: value }],
    });
    

    if (!user || user?.deleted) {
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
      { id: user._id, role: user.role, name: user.name }, // Payload
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


export const forgotPassword = async (req, res) => {
  try {
    const { type, value } = req.body;

    if (!type || !value) {
      return res.status(400).json({ message: "Type and value are required", success: false });
    }

    // Find user by email or phone
    const user = await User.findOne(type === "email" ? { email: value } : { phone: value });

    if (!user || user?.deleted) {
      return res.status(400).json({ message: "User not found", success: false });
    }

    // Generate OTP (6-digit random number)
    const otp = crypto.randomInt(100000, 999999).toString();

    // Save OTP in the database with 5 minutes expiration
    await OTP.create({ value, otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    // Send OTP via email/SMS (Implement sending logic here)
    console.log(`🔹 OTP for ${value}: ${otp}`);

    return res.status(200).json({
      message: "OTP sent successfully",
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

export const verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { otp, newPassword, value } = req.body;

    if (!otp || !newPassword || !value) {
      return res.status(400).json({ message: "OTP, newPassword, and value are required", success: false });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ value, otp, used: false });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP", success: false });
    }

    // Find user by email or phone
    const user = await User.findOne({ $or: [{ email: value }, { phone: value }] });

    if (!user) {
      return res.status(400).json({ message: "User not found", success: false });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    return res.status(200).json({
      message: "Password reset successful",
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


export const updateProfile = async (req, res) => {
  try {
    const { email, phone, name, password } = req.body;
    const token = req.headers.authorization?.split(" ")[1]; // Get token from headers

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided", success: false });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized: Invalid token", success: false });
    }

    // Extract user ID from token
    const userId = decoded.id;

    // Find user in DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password", success: false });
    }

    // Check if email or phone already exists (excluding the current user)
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use", success: false });
      }
    }

    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ message: "Phone number already in use", success: false });
      }
    }

    // Update user information
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating profile", success: false });
  }
};


export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from headers

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided", success: false });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized: Invalid token", success: false });
    }

    // Extract user ID from token
    const userId = decoded.id;

    // Validate avatar value
    const allowedAvatars = ["", "avatar1", "avatar2", "avatar3", "avatar4", "avatar5"];
    if (!allowedAvatars.includes(avatar)) {
      return res.status(400).json({ message: "Invalid avatar selected", success: false });
    }

    // Find user in DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Update avatar
    user.avatar = avatar;
    await user.save();

    return res.status(200).json({
      message: "Avatar updated successfully",
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating avatar", success: false });
  }
};

export const deactivateAccount = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided", success: false });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized: Invalid token", success: false });
    }

    // Extract user ID from token
    const userId = decoded.id;

    // Find the user in DB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    // Soft delete by setting `deleted: true`
    user.deleted = true;
    await user.save();

    return res.status(200).json({
      message: "Account deactivated successfully",
      success: true
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deactivating account", success: false });
  }
};


export const listUsers = async (req, res) => {
  try {
    // Extract the token from the Authorization header
    const token = req.headers.authorization?.split(" ")[1]; // Bearer token

    if (!token) {
      return res.status(401).json({
        message: "Token is missing",
        success: false,
      });
    }

    // Decode and verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the role is 'admin'
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        message: "Access denied. Admin role required.",
        success: false,
      });
    }

    // Fetch all users from the database
    const users = await User.find();

    // Return the list of users
    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while fetching users",
      success: false,
    });
  }
};





export const confirmAppointment = async (req, res) => {
  try {
    // Get token from headers
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided", success: false });
    }

    // Decode token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Extract appointment details from request body
    let { slot_date, slot_range_time, approx_amount } = req.body;

    if (!slot_date || !slot_range_time || !approx_amount) {
      return res.status(400).json({ message: "Missing required fields", success: false });
    }

    // Convert slot_date from "DD/MM/YYYY" to "YYYY-MM-DD"
    const dateParts = slot_date.split('/');
    if (dateParts.length !== 3) {
      return res.status(400).json({ message: "Invalid date format. Use DD/MM/YYYY", success: false });
    }

    // Convert to ISO format (YYYY-MM-DD)
    slot_date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T00:00:00.000Z`);

    // Save appointment in the database
    const appointment = await Appointment.create({
      user: userId,
      slot_date,
      slot_range_time,
      approx_amount,
    });

    return res.status(201).json({
      message: "Appointment confirmed successfully",
      success: true,
      appointment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while confirming the appointment",
      success: false,
    });
  }
};

// Function to list appointments based on user role
export const listAppointments = async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization.split(' ')[1]; // "Bearer <token>"

    if (!token) {
      return res.status(401).json({ message: "No token provided", success: false });
    }

    // Decode the token to get user ID and role
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const userRole = decoded.role;

    // Check if the user is an admin
    if (userRole === 'admin') {
      // If the user is an admin, return all appointments with user details
      const appointments = await Appointment.find()
        .populate('user', 'name email phone role'); // Populate user details (name, email, etc.)
      
      return res.status(200).json({
        message: "All appointments retrieved successfully",
        success: true,
        appointments,
      });
    } else {
      // If the user is a regular user, return only their own appointments
      const appointments = await Appointment.find({ user: userId });

      return res.status(200).json({
        message: "User appointments retrieved successfully",
        success: true,
        appointments,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while retrieving appointments",
      success: false,
    });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"

    if (!token) {
      return res.status(401).json({ message: "No token provided", success: false });
    }

    // Decode the token to get user ID and role
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const userRole = decoded.role;

    // Get appointment ID from request params
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid appointment ID", success: false });
    }

    // Find appointment
    let appointment;
    if (userRole === 'admin') {
      // Admin can access any appointment, including user details
      appointment = await Appointment.findById(id).populate('user', 'name email phone role');
    } else {
      // Regular users can only access their own appointments
      appointment = await Appointment.findOne({ _id: id, user: userId });
    }

    // If no appointment found
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found", success: false });
    }

    return res.status(200).json({
      message: "Appointment retrieved successfully",
      success: true,
      appointment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while retrieving the appointment",
      success: false,
    });
  }
};


export const approveAppointment = async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided", success: false });
    }

    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if the user is an admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: Admin access required", success: false });
    }

    // Get appointment ID from URL params
    const { id } = req.params;

    // Find the appointment by ID
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found", success: false });
    }

    // Update the appointment status to "approved"
    appointment.status = "approved";
    await appointment.save();

    return res.status(200).json({
      message: "Appointment approved successfully",
      success: true,
      appointment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while approving the appointment",
      success: false,
    });
  }
};