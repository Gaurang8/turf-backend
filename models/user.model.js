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
      sparse: true, // Allows multiple null values, but unique non-null values
      validate: {
        validator: function (value) {
          return value || this.phone; // Ensure at least one of email or phone is provided
        },
        message: "Either email or phone number is required",
      },
    },
    phone: {
      type: String,
      sparse: true,
      validate: {
        validator: function (value) {
          return value || this.email; // Ensure at least one of email or phone is provided
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
    avatar: {
      type: String,
      enum: ["", "avatar1", "avatar2", "avatar3", "avatar4", "avatar5"],
      default: "", // Default empty value
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ **Ensure at least one of `email` or `phone` is provided before saving**
userSchema.pre("save", function (next) {
  if (!this.email && !this.phone) {
    return next(new Error("Either email or phone number is required."));
  }
  next();
});

// ✅ **Compound Unique Index: Ensures `email` and `phone` are unique if provided**
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User = mongoose.model("User", userSchema, "turf");
