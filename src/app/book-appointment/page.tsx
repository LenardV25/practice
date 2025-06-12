'use client'; // This component needs to be a Client Component to use hooks like useState, useEffect, etc.

import { createBooking } from "../login/actions"; // Import createBooking action
import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from 'next/navigation'; // For redirection after booking

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

export default function BookAppointmentPage() {
  const router = useRouter();

  // State for booking form functionality
  const [bookingResult, setBookingResult] = useState<BookingFormState>({ message: '' });
  const [isBookingPending, startBookingTransition] = useTransition();

  // State for date selection (starts with today's date)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // useRef to get a direct reference to the form element for resetting it
  const bookingFormRef = useRef<HTMLFormElement>(null);

  // Handler for the booking form submission
  const handleBookingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData(event.currentTarget);

    // Explicitly append the selectedDate to formData
    // Ensure the date is formatted as 'YYYY-MM-DD' for the server action
    formData.set('date', selectedDate.toISOString().split('T')[0]);

    startBookingTransition(async () => {
      const result = await createBooking(undefined, formData);
      setBookingResult(result);

      // If booking was successful, reset the form and redirect
      if (result.success) {
        if (bookingFormRef.current) {
          bookingFormRef.current.reset(); // Clear form fields using the ref
        }
        router.push('/dashboard'); // Redirect to dashboard after successful booking
      }
    });
  };

  return (
    // Main container with a soft gradient background
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Central card for the booking form */}
      <div className="w-full max-w-md bg-white shadow-2xl rounded-xl p-8 transform transition-all duration-300 hover:scale-[1.01] border border-blue-100">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-8 text-center border-b pb-4 border-blue-200">Book New Appointment</h1>
        
        {/* Date Picker Section */}
        <div className="mb-6">
            <label htmlFor="bookingDate" className="block text-gray-700 text-sm font-semibold mb-2">Select Date</label>
            <input
                type="date"
                id="bookingDate"
                name="date"
                value={selectedDate.toISOString().split('T')[0]} // Format date for input type="date"
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                required
                // Enhanced input styling
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
            {bookingResult?.errors?.date && (
                <p className="text-red-500 text-sm mt-1">{bookingResult.errors.date.join(', ')}</p>
            )}
        </div>

        {/* The Booking Form */}
        <form onSubmit={handleBookingSubmit} ref={bookingFormRef} className="grid grid-cols-1 gap-y-6">
          {/* Start Time Input */}
          <div>
            <label htmlFor="startTime" className="block text-gray-700 text-sm font-semibold mb-2">Start Time</label>
            <input
              type="time"
              id="startTime"
              name="startTime"
              required
              // Enhanced input styling
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
            {bookingResult?.errors?.startTime && (
              <p className="text-red-500 text-sm mt-1">{bookingResult.errors.startTime.join(', ')}</p>
            )}
          </div>

          {/* End Time Input */}
          <div>
            <label htmlFor="endTime" className="block text-gray-700 text-sm font-semibold mb-2">End Time</label>
            <input
              type="time"
              id="endTime"
              name="endTime"
              required
              // Enhanced input styling
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
            {bookingResult?.errors?.endTime && (
              <p className="text-red-500 text-sm mt-1">{bookingResult.errors.endTime.join(', ')}</p>
            )}
          </div>

          {/* Details Textarea */}
          <div>
            <label htmlFor="details" className="block text-gray-700 text-sm font-semibold mb-2">Details (Optional)</label>
            <textarea
              id="details"
              name="details"
              rows={3}
              // Enhanced textarea styling
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm resize-y"
              placeholder="e.g., Meeting with client, haircut, etc."
            ></textarea>
            {bookingResult?.errors?.details && (
              <p className="text-red-500 text-sm mt-1">{bookingResult.errors.details.join(', ')}</p>
            )}
          </div>

          {/* General Booking Errors */}
          {bookingResult?.errors?.general && (
            <p className="text-red-500 text-sm mt-2 font-bold text-center">
              {bookingResult.errors.general.join(', ')}
            </p>
          )}

          {/* Booking Success Message */}
          {bookingResult?.success && (
            <p className="text-green-500 text-sm mt-2 font-bold text-center">
              {bookingResult.message}
            </p>
          )}

          {/* Submit Button for Booking */}
          <div className="flex justify-center mt-6"> {/* Increased top margin */}
            <button
              type="submit"
              disabled={isBookingPending}
              // Enhanced button styling with gradient and shadow
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg w-full"
            >
              {isBookingPending ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>

        {/* Link back to Dashboard */}
        <div className="mt-8 text-center"> {/* Increased top margin */}
            <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:underline font-medium focus:outline-none text-sm"
            >
                Back to Dashboard
            </button>
        </div>
      </div>
    </div>
  );
}
