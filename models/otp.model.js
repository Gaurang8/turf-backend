import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    value: { type: String, required: true }, // Email or phone
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }, // Mark OTP as used after verification
  },
  { timestamps: true }
);

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model("OTP", otpSchema , "turf_otp_collection");
