// src/models/Booking.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for a Booking document
export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId; // Reference to the User who made the booking
  date: Date;                     // The date of the booking
  startTime: string;              // E.g., "09:00 AM", "14:30" (string for simplicity, or use Date if time zone handling is critical)
  endTime: string;                // E.g., "10:00 AM", "15:30"
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; // Current status of the booking
  details?: string;               // Optional: notes or purpose of the booking
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose schema for the Booking model
const BookingSchema: Schema<IBooking> = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // This creates the reference to your User model
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String, // You can use Date for stricter time handling, but string is simpler initially
    required: true,
  },
  endTime: {
    type: String, // Same as startTime
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], // Restrict to specific values
    default: 'pending', // Default status for new bookings
    required: true,
  },
  details: {
    type: String,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// Export the Mongoose model. If the model already exists, use it; otherwise, create it.
const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
