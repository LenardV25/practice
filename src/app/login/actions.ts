'use server'; // This directive marks the file as a Server Action file

import dbConnect from '@/lib/dbConnect'; // Utility to connect to the database
import User, { iUser } from '@/models/User';       // Your Mongoose User model, import iUser interface
import Booking, { IBooking } from '@/models/Bookings'; // Import the Booking model and its interface
import bcrypt from 'bcryptjs';         // For comparing and hashing passwords
import { cookies } from 'next/headers'; // Import cookies for session management
import mongoose from 'mongoose';       // Import mongoose directly for ObjectId
import { signToken, verifyToken } from '@/lib/auth'; // Import signToken and verifyToken

// Define the type for the form state, including potential errors for authentication
interface FormState {
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    general?: string[];
  };
  success?: boolean;
}

// Define the type for the form state, including potential errors for booking
interface BookingFormState {
  message: string;
  errors?: {
    date?: string[];
    startTime?: string[];
    endTime?: string[];
    details?: string[];
    general?: string[];
  };
  success?: boolean;
  bookingId?: string; // Optionally return the ID of the created booking
}

// Define the type for the form state for updating a booking
interface UpdateBookingFormState {
  message: string;
  errors?: {
    startTime?: string[];
    endTime?: string[];
    details?: string[]; // Allow details to be updated as well
    general?: string[];
  };
  success?: boolean;
}

// Define the type for fetched user details
interface UserDetailsState {
  name: string | null;
  email: string | null;
  success: boolean;
  message?: string;
}

/**
 * Helper function to get the current authenticated user's ID from the session cookie.
 * @returns {Promise<string | null>} The user ID if authenticated, otherwise null.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('sessionToken')?.value;

  if (!sessionToken) {
    console.log('No session token found.');
    return null;
  }

  try {
    const decoded = await verifyToken(sessionToken);
    console.log('Session token verified. userId:', decoded.userId);
    return decoded.userId;
  } catch (error) {
    console.error('Failed to verify session token:', error);
    return null;
  }
}

/**
 * Server Action for user authentication (login or registration).
 * Handles form submission, validates credentials, and performs the requested operation.
 * @param {FormState} prevState The previous state of the form.
 * @param {FormData} formData The form data submitted by the client.
 * @returns {Promise<FormState>} The new state of the form.
 */
export async function authenticate(prevState: FormState | undefined, formData: FormData): Promise<FormState> {
  await dbConnect();

  const mode = formData.get('formMode') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  const errors: { name?: string[]; email?: string[]; password?: string[]; general?: string[] } = {};

  // --- Basic Server-Side Validation ---
  if (!email || email.trim() === '') {
    errors.email = ['Email is required.'];
  } else {
    // NEW VALIDATION: Check email domain
    const allowedDomains = ['gmail.com', 'yahoo.com'];
    const emailDomain = email.split('@')[1];
    if (!emailDomain || !allowedDomains.includes(emailDomain.toLowerCase())) {
      errors.email = ['Only @gmail.com or @yahoo.com emails are allowed.'];
    }
  }

  if (!password || password.trim() === '') {
    errors.password = ['Password is required.'];
  }

  if (mode === 'register') {
    if (!name || name.trim() === '') {
      errors.name = ['Name is required.'];
    }
  }

  if (Object.keys(errors).length > 0) {
    return { message: 'Validation failed.', errors };
  }

  try {
    let userFound: iUser | null = null;

    if (mode === 'login') {
      userFound = await User.findOne({ email });

      if (!userFound) {
        errors.general = ['Invalid email or password.'];
        return { message: 'Login failed.', errors };
      }

      const isMatch = await bcrypt.compare(password, userFound.password);

      if (!isMatch) {
        errors.general = ['Invalid email or password.'];
        return { message: 'Login failed.', errors };
      }

      console.log('User logged in successfully:', userFound.email);
    } else if (mode === 'register') {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        errors.general = ['Email already registered.'];
        return { message: 'Registration failed.', errors };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      userFound = await User.create({ name, email, password: hashedPassword });

      console.log('User registered successfully:', userFound.email);
      console.log('Registered User Details:');
      console.log(`  Name: ${userFound.name}`);
      console.log(`  Email: ${userFound.email}`);
      console.log(`  Hashed Password: ${userFound.password}`);
    } else {
      errors.general = ['Invalid form operation mode.'];
      return { message: 'Operation failed.', errors };
    }

    // Issue a JWT token and set it as an HTTP-only cookie upon successful authentication
    if (userFound) {
      const token = await signToken({ userId: userFound._id.toString(), email: userFound.email });
      (await cookies()).set('sessionToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
      });
      return { message: `${mode === 'register' ? 'Registration' : 'Login'} successful!`, success: true };
    }

    return { message: 'Authentication failed: User not found after operation.', errors: { general: ['Authentication failed.'] } };

  } catch (error: any) {
    console.error('Authentication/Registration error:', error);
    if (error.code === 11000) {
      errors.general = ['Email already exists.'];
    } else {
      errors.general = ['An unexpected error occurred. Please try again.'];
    }
    return { message: 'Operation failed.', errors };
  }
}

/**
 * Server Action for user logout.
 * This function clears session cookies and returns a success state.
 */
export async function logout() {
  'use server';

  console.log('User attempting to log out...');
  (await cookies()).delete('sessionToken');
  console.log('Session cookie "sessionToken" cleared.');
  return { success: true, message: 'Logged out successfully.' };
}

/**
 * Server Action to create a new booking timeslot.
 * @param {BookingFormState} prevState The previous state of the form.
 * @param {FormData} formData The form data containing booking details.
 * @returns {Promise<BookingFormState>} The new state of the form.
 */
export async function createBooking(prevState: BookingFormState | undefined, formData: FormData): Promise<BookingFormState> {
  'use server';

  await dbConnect();

  const errors: { date?: string[]; startTime?: string[]; endTime?: string[]; details?: string[]; general?: string[] } = {};

  // Get userId securely from the session cookie
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    errors.general = ['Authentication required to create a booking. Please log in.'];
    return { message: 'Authentication failed.', errors };
  }

  const dateString = formData.get('date') as string; // e.g., "2025-06-12"
  const startTime = formData.get('startTime') as string; // e.g., "09:00" (24-hour format)
  const endTime = formData.get('endTime') as string;     // e.g., "10:00" (24-hour format)
  const details = formData.get('details') as string;

  if (!dateString) {
    errors.date = ['Date is required.'];
  }
  if (!startTime) {
    errors.startTime = ['Start time is required.'];
  }
  if (!endTime) {
    errors.endTime = ['End time is required.'];
  }

  let bookingDateForDb: Date; // This will be the Date object for the 'date' field in DB

  try {
    // Construct a date string in ISO format including the UTC-5 offset.
    // This ensures `new Date()` parses it correctly into its UTC equivalent,
    // reflecting the desired UTC-5 time.
    // Example: If dateString="2025-06-12" and startTime="09:00" (user input for UTC-5)
    // The ISO string becomes "2025-06-12T09:00:00-05:00"
    // When parsed by new Date(), this will result in a Date object whose UTC value is
    // 2025-06-12T14:00:00.000Z (because 09:00 in UTC-5 is 14:00 UTC)
    const isoDateStringWithOffset = `${dateString}T${startTime}:00-05:00`; // Using -05:00 for UTC-5 offset
    bookingDateForDb = new Date(isoDateStringWithOffset);

    if (isNaN(bookingDateForDb.getTime())) {
      errors.date = [...(errors.date || []), 'Invalid date or time format.'];
    }
  } catch (e) {
    errors.date = [...(errors.date || []), 'Invalid date or time format for booking.'];
  }

  // --- Date and Time Validation (relative to UTC-5) ---
  const now = new Date();
  // Get current time in UTC-5 timezone for accurate comparison
  // Using 'America/Chicago' for UTC-5 which covers CDT/CST.
  const currentMomentInUTC5 = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  
  // Normalize currentMomentInUTC5 to the beginning of its day (midnight UTC-5)
  const todayMidnightInUTC5 = new Date(currentMomentInUTC5);
  todayMidnightInUTC5.setHours(0, 0, 0, 0);

  // Normalize the booking date to the beginning of its day (midnight UTC-5) for comparison
  const bookingDateMidnightInUTC5 = new Date(bookingDateForDb.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  bookingDateMidnightInUTC5.setHours(0, 0, 0, 0);


  if (bookingDateMidnightInUTC5 < todayMidnightInUTC5) {
    errors.date = [...(errors.date || []), 'Cannot book appointments in the past.'];
  }

  // Time comparison for today's bookings
  if (bookingDateMidnightInUTC5.getTime() === todayMidnightInUTC5.getTime()) {
    const [currentHour, currentMinute] = [currentMomentInUTC5.getHours(), currentMomentInUTC5.getMinutes()];
    const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    if (startTime <= currentTimeString) {
      errors.startTime = [...(errors.startTime || []), 'Start time cannot be in the past for today.'];
    }
  }

  if (startTime && endTime) {
    const startNum = parseInt(startTime.replace(':', ''));
    const endNum = parseInt(endTime.replace(':', ''));
    if (startNum >= endNum) {
      errors.endTime = [...(errors.endTime || []), 'End time must be after start time.'];
    }
  }

  if (Object.keys(errors).length > 0) {
    return { message: 'Validation failed.', errors };
  }

  try {
    // NEW VALIDATION: Check for overlapping bookings for the same date and time slot
    // The `date` field in MongoDB is UTC. The `bookingDateForDb` variable
    // already holds the UTC equivalent of the user's intended UTC-5 date/time.
    // The `startTime` and `endTime` strings are kept as HH:MM to perform
    // lexicographical comparison for overlaps within that date.
    const overlappingBooking = await Booking.findOne({
      date: bookingDateForDb, // Match the exact UTC equivalent of the UTC-5 date
      $and: [
        // Existing booking starts before the new booking ends
        { startTime: { $lt: endTime } },
        // Existing booking ends after the new booking starts
        { endTime: { $gt: startTime } }
      ]
    });

    if (overlappingBooking) {
      errors.general = ['This time slot overlaps with an existing booking. Please choose another time.'];
      return { message: 'Booking failed.', errors };
    }

    const newBooking = await Booking.create({
      userId: new mongoose.Types.ObjectId(userId), // Use the securely obtained userId
      date: bookingDateForDb, // Save the UTC-adjusted Date object
      startTime, // Save original HH:MM string for local time
      endTime,   // Save original HH:MM string for local time
      details,
      status: 'pending',
    });

    console.log('New booking created:', newBooking);
    return { success: true, message: 'Booking created successfully!', bookingId: newBooking._id.toString() };

  } catch (error: any) {
    console.error('Error creating booking:', error);
    errors.general = ['An unexpected error occurred while creating the booking.'];
    return { message: 'Failed to create booking.', errors };
  }
}

/**
 * Server Action to fetch bookings for a specific user.
 * @returns {Promise<{ success: boolean; data?: IBooking[]; message?: string; }>} The result containing bookings or an error message.
 */
export async function fetchBookings(): Promise<{ success: boolean; data?: IBooking[]; message?: string; }> {
  'use server';

  await dbConnect();

  // Get userId securely from the session cookie
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, message: 'Authentication required to fetch bookings.' };
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    // Fetch bookings and sort them. The 'date' field will be Date objects (UTC).
    const bookings = await Booking.find({ userId: userObjectId }).sort({ date: 1, startTime: 1 });
    console.log(`Fetched ${bookings.length} bookings for user ${userId}.`);
    // Convert Mongoose documents to plain JSON to be passed to client component
    return { success: true, data: JSON.parse(JSON.stringify(bookings)) };

  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return { success: false, message: `Failed to fetch bookings: ${error.message}` };
  }
}

/**
 * Server Action to delete a specific appointment.
 * @param {string} bookingId The ID of the booking to delete.
 * @returns {Promise<{ success: boolean; message: string; }>} Result of the deletion.
 */
export async function deleteBooking(bookingId: string): Promise<{ success: boolean; message: string; }> {
  'use server';

  await dbConnect();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, message: 'Authentication required to delete a booking.' };
  }

  if (!bookingId) {
    return { success: false, message: 'Booking ID is required to delete.' };
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const bookingObjectId = new mongoose.Types.ObjectId(bookingId);

    // Ensure the user owns the booking before deleting
    const result = await Booking.deleteOne({ _id: bookingObjectId, userId: userObjectId });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Booking not found or you do not have permission to delete it.' };
    }

    console.log(`Deleted booking ${bookingId} for user ${userId}.`);
    return { success: true, message: 'Booking deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting booking:', error);
    return { success: false, message: `Failed to delete booking: ${error.message}` };
  }
}

/**
 * Server Action to update a specific appointment's times and details.
 * @param {UpdateBookingFormState | undefined} prevState The previous state of the form.
 * @param {FormData} formData The form data containing booking details.
 * @returns {Promise<UpdateBookingFormState>} The new state of the form.
 */
export async function updateBooking(prevState: UpdateBookingFormState | undefined, formData: FormData): Promise<UpdateBookingFormState> {
  'use server';

  await dbConnect();

  const errors: { startTime?: string[]; endTime?: string[]; details?: string[]; general?: string[] } = {};

  // Log received formData entries for debugging
  console.log('Received formData for updateBooking:');
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.log('updateBooking: Authentication failed - No userId found.');
    errors.general = ['Authentication required to update a booking. Please log in.'];
    return { message: 'Authentication failed.', errors };
  }

  const bookingId = formData.get('bookingId') as string;
  const startTime = formData.get('startTime') as string;
  const endTime = formData.get('endTime') as string;
  // Ensure details is correctly extracted, it might be null or undefined if not provided
  const details = formData.get('details') as string | null; // Allow null as it's optional

  console.log(`updateBooking: Attempting to update bookingId: ${bookingId} for userId: ${userId}`);
  console.log(`  New startTime: ${startTime}, new endTime: ${endTime}, new details: ${details}`);


  if (!bookingId) {
    console.log('updateBooking: Validation failed - Booking ID is missing.');
    errors.general = ['Booking ID is missing for update.'];
  }
  if (!startTime) {
    console.log('updateBooking: Validation failed - Start time is required.');
    errors.startTime = ['Start time is required.'];
  }
  if (!endTime) {
    console.log('updateBooking: Validation failed - End time is required.');
    errors.endTime = ['End time is required.'];
  }

  // Basic time validation (end time after start time)
  if (startTime && endTime) {
    const start = parseInt(startTime.replace(':', ''));
    const end = parseInt(endTime.replace(':', ''));
    if (start >= end) {
      console.log('updateBooking: Validation failed - End time must be after start time.');
      errors.endTime = [...(errors.endTime || []), 'End time must be after start time.'];
    }
  }

  if (Object.keys(errors).length > 0) {
    console.log('updateBooking: Returning validation errors.');
    return { message: 'Validation failed.', errors };
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const bookingObjectId = new mongoose.Types.ObjectId(bookingId);

    // Prepare update object. Only include details if it's provided.
    const updateFields: { startTime: string; endTime: string; details?: string | null } = {
      startTime,
      endTime,
    };
    // Mongoose handles `null` or `undefined` for optional fields by setting them to null.
    // If the field is completely omitted, it won't be updated.
    // To explicitly set details to null if cleared by user, ensure it's included.
    updateFields.details = details; // This will update it to empty string if cleared


    console.log('updateBooking: Executing findOneAndUpdate...');
    console.log(`  Query: {_id: ${bookingObjectId}, userId: ${userObjectId}}`);
    console.log(`  Update: ${JSON.stringify(updateFields)}`);

    // Update the booking document. Ensure the user owns this booking.
    const result = await Booking.findOneAndUpdate(
      { _id: bookingObjectId, userId: userObjectId }, // Query: find by booking ID and user ID
      { $set: updateFields }, // Update the specified fields
      { new: true } // Return the updated document
    );

    if (!result) {
      console.log('updateBooking: Booking not found or user does not have permission.');
      return { success: false, message: 'Booking not found or you do not have permission to update it.' };
    }

    console.log(`updateBooking: Successfully updated booking ${bookingId} for user ${userId}.`);
    return { success: true, message: 'Booking updated successfully!' };
  } catch (error: any) {
    console.error('updateBooking: Error updating booking:', error);
    errors.general = ['An unexpected error occurred while updating the booking.'];
    return { message: 'Failed to update booking.', errors };
  }
}

/**
 * Server Action to delete past appointments.
 * An appointment is considered 'past' if its date is before today (UTC-5),
 * or if it's today (UTC-5) and its end time has passed (UTC-5).
 * @returns {Promise<{ success: boolean; deletedCount?: number; message: string; }>} Result of the deletion.
 */
export async function clearPastAppointments(): Promise<{ success: boolean; deletedCount?: number; message: string; }> {
  'use server';

  await dbConnect();

  try {
    const now = new Date();
    // Get current time in UTC-5 timezone for accurate comparison
    const currentMomentInUTC5 = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    
    // Normalize currentMomentInUTC5 to the beginning of its day (midnight UTC-5)
    const todayMidnightInUTC5 = new Date(currentMomentInUTC5.getFullYear(), currentMomentInUTC5.getMonth(), currentMomentInUTC5.getDate());
    // Convert this to its UTC representation for MongoDB comparison
    const todayMidnightUTC = new Date(Date.UTC(todayMidnightInUTC5.getFullYear(), todayMidnightInUTC5.getMonth(), todayMidnightInUTC5.getDate(), 5)); // 5 AM UTC is midnight UTC-5

    // Get tomorrow's midnight in UTC-5 (as a UTC Date object) for range queries
    const tomorrowMidnightInUTC5 = new Date(todayMidnightInUTC5);
    tomorrowMidnightInUTC5.setDate(todayMidnightInUTC5.getDate() + 1);
    const tomorrowMidnightUTC = new Date(Date.UTC(tomorrowMidnightInUTC5.getFullYear(), tomorrowMidnightInUTC5.getMonth(), tomorrowMidnightInUTC5.getDate(), 5));

    // Get current time string in UTC-5 for comparison with startTime/endTime strings
    const currentHourUTC5 = currentMomentInUTC5.getHours();
    const currentMinuteUTC5 = currentMomentInUTC5.getMinutes();
    const currentTimeStringUTC5 = `${String(currentHourUTC5).padStart(2, '0')}:${String(currentMinuteUTC5).padStart(2, '0')}`;

    // Query to find appointments that are in the past
    const query = {
      $or: [
        // Condition 1: Booking date is strictly before today's midnight in UTC-5 (as UTC)
        { date: { $lt: todayMidnightUTC } },

        // Condition 2: Booking date is today (in UTC-5) AND booking end time is less than current time (in UTC-5)
        {
          date: {
            $gte: todayMidnightUTC,     // Start of today in UTC-5 (as UTC)
            $lt: tomorrowMidnightUTC   // Start of tomorrow in UTC-5 (as UTC)
          },
          endTime: { $lt: currentTimeStringUTC5 }
        }
      ]
    };

    const result = await Booking.deleteMany(query);

    console.log(`Cleared ${result.deletedCount} past appointments.`);
    return { success: true, deletedCount: result.deletedCount, message: `Successfully cleared ${result.deletedCount} past appointments.` };
  } catch (error: any) {
    console.error('Error clearing past appointments:', error);
    return { success: false, message: `Failed to clear past appointments: ${error.message}` };
  }
}

/**
 * Server Action to fetch authenticated user's details.
 * @returns {Promise<UserDetailsState>} Result containing user details or an error.
 */
export async function fetchUserDetails(): Promise<UserDetailsState> {
  'use server';

  await dbConnect();

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { success: false, name: null, email: null, message: 'Not authenticated.' };
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId).select('name email'); // Only fetch name and email

    if (!user) {
      return { success: false, name: null, email: null, message: 'User not found.' };
    }

    return { success: true, name: user.name, email: user.email };
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return { success: false, name: null, email: null, message: `Failed to fetch user details: ${error.message}` };
  }
}

/**
 * Server Action to fetch all dates that have at least one booking.
 * This is used to indicate 'taken' days on the calendar that are not by the current user.
 * @returns {Promise<{ success: boolean; data?: string[]; message?: string; }>} A list of uniqueYYYY-MM-DD date strings with bookings.
 */
export async function fetchGlobalBookedDates(): Promise<{ success: boolean; data?: string[]; message?: string; }> {
  'use server';

  await dbConnect();

  try {
    // Use the `distinct` aggregation to get all unique 'date' values from the Booking collection.
    // The `date` field is stored as an ISO Date object (UTC).
    const bookedDates: Date[] = await Booking.distinct('date');

    // Convert Date objects to 'YYYY-MM-DD' strings, adjusting to UTC-5 timezone for consistency
    const bookedDateStringsUTC5 = bookedDates.map(date => {
      // Create a date in America/Chicago timezone
      const dateInUTC5 = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const year = dateInUTC5.getFullYear();
      const month = String(dateInUTC5.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
      const day = String(dateInUTC5.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    return { success: true, data: bookedDateStringsUTC5 };
  } catch (error: any) {
    console.error('Error fetching global booked dates:', error);
    return { success: false, message: `Failed to fetch global booked dates: ${error.message}` };
  }
}
