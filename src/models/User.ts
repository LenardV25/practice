import mongoose, { Document, Schema, Model } from "mongoose";

// Define the interface for a User document
export interface iUser extends Document {
  name: string;
  email: string;
  password: string; // This will store the HASHED password
}

// Define the Mongoose Schema for the User model
const userSchema = new Schema<iUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensures email addresses are unique in the database
  },
  password: {
    type: String,
    required: true,
  },
});

// Check if the User model already exists to prevent re-compilation in Next.js hot-reloading
// If it exists, use it; otherwise, create a new one.
const User: Model<iUser> = mongoose.models.User || mongoose.model<iUser>("User", userSchema);

export default User;
