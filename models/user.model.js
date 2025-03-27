import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      validate: {
        validator: function (value) {
          return this.phone || value; // Ensure at least one of email or phone is provided
        },
        message: "Either email or phone number is required",
      },
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (value) {
          return this.email || value; // Ensure at least one of email or phone is provided
        },
        message: "Either email or phone number is required",
      },
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
