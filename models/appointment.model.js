import mongoose from 'mongoose';

// Create a Schema for Appointment
const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
      required: true,
    },
    booking_date: {
      type: Date,
      default: Date.now, // Automatically set to current date if not provided
    },
    slot_date: {
      type: Date,
      required: true,
    },
    slot_range_time: {
      type: String, // E.g., "10:00 AM - 11:00 AM"
      required: true,
    },
    approx_amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'completed', 'cancelled'],
      default: 'pending', // Default status is 'pending'
    },
  },
  {
    timestamps: true, // This will automatically create 'createdAt' and 'updatedAt' fields
  }
);

// Create the Appointment model
const Appointment = mongoose.model('Appointment', appointmentSchema , "turf_appointment");

export default Appointment;
