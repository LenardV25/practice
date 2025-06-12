'use client'; // This component needs to be a Client Component

import { logout, fetchBookings, clearPastAppointments, deleteBooking, updateBooking, fetchUserDetails, fetchGlobalBookedDates } from "../login/actions"; // updateBooking is no longer directly used in this component, but keeping the import for now as it's part of actions.ts
import { useRouter } from 'next/navigation';
import { useState, useEffect, useTransition, useRef } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default react-calendar styles
import { IBooking } from '@/models/Bookings';

// Import the new dashboard-specific styles
import './dashboard-styles.css';


// Define a simple state type for logout action
interface LogoutState {
    success?: boolean;
    message: string;
}

// Interface for the fetched bookings state
interface FetchedBookingsState {
  data: IBooking[];
  loading: boolean;
  error: string | null;
}

// State for clearing past appointments
interface ClearAppointmentsState { 
  success?: boolean;
  message: string;
  deletedCount?: number;
}

// Define the type for the form state for updating a booking (matches action's return type)
// This interface is no longer directly used by the DashboardPage, but kept if EditBookingModal was external.
// Since EditBookingModal is now removed, this interface could be removed too if not used elsewhere.
interface UpdateBookingFormState {
  message: string;
  errors?: {
    startTime?: string[];
    endTime?: string[];
    details?: string[];
    general?: string[];
  };
  success?: boolean;
}

// Define the type for fetched user details (must match the return type of fetchUserDetails)
interface UserDetailsState {
  name: string | null;
  email: string | null;
  success: boolean;
  message?: string;
}


// Removed the EditBookingModal component entirely as requested.
/*
// Inline component for the Edit Booking Modal
interface EditBookingModalProps {
  booking: IBooking; // The booking object to edit
  onClose: () => void; // Function to close the modal
  onUpdateSuccess: () => void; // Function to call after successful update (e.g., refresh bookings)
}

function EditBookingModal({ booking, onClose, onUpdateSuccess }: EditBookingModalProps) {
  const [editResult, setEditResult] = useState<UpdateBookingFormState>({ message: '' });
  const [isUpdating, startUpdatingTransition] = useTransition();
  const editFormRef = useRef<HTMLFormElement>(null);

  // Initial state for form fields, ensures values are pulled from the booking prop
  const [startTime, setStartTime] = useState(booking.startTime);
  const [endTime, setEndTime] = useState(booking.endTime);
  const [details, setDetails] = useState(booking.details || ''); // Handle optional details

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('bookingId', booking._id.toString()); // Pass the booking ID

    // Log the formData being sent for debugging
    console.log('EditBookingModal: Submitting form data...');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    startUpdatingTransition(async () => {
      const result = await updateBooking(undefined, formData);
      setEditResult(result); // Update the state with the result from the action

      // Log the result from the server action
      console.log('EditBookingModal: Server action result:', result);

      if (result.success) {
        onUpdateSuccess(); // Notify parent to refresh bookings
        onClose(); // Close the modal
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 p-4 overflow-y-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center transform transition-all duration-300 scale-100">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Edit Appointment for {new Date(booking.date).toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>
        
        <form onSubmit={handleEditSubmit} ref={editFormRef} className="grid grid-cols-1 gap-4 text-left">
          <input type="hidden" name="bookingId" value={booking._id.toString()} />

          <div>
            <label htmlFor="editStartTime" className="block text-gray-700 text-sm font-bold mb-2">Start Time</label>
            <input
              type="time"
              id="editStartTime"
              name="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {editResult?.errors?.startTime && (
              <p className="text-red-500 text-sm mt-1">{editResult.errors.startTime.join(', ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="editEndTime" className="block text-gray-700 text-sm font-bold mb-2">End Time</label>
            <input
              type="time"
              id="editEndTime"
              name="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {editResult?.errors?.endTime && (
              <p className="text-red-500 text-sm mt-1">{editResult.errors.endTime.join(', ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="editDetails" className="block text-gray-700 text-sm font-bold mb-2">Details (Optional)</label>
            <textarea
              id="editDetails"
              name="details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g., Meeting with client, haircut, etc."
            ></textarea>
            {editResult?.errors?.details && (
              <p className="text-red-500 text-sm mt-1">{editResult.errors.details.join(', ')}</p>
            )}
          </div>

          {editResult?.errors?.general && (
            <p className="text-red-500 text-sm mt-2 font-bold text-center">
              {editResult.errors.general.join(', ')}
            </p>
          )}

          {editResult?.success && (
            <p className="text-green-500 text-sm mt-2 font-bold text-center">
              {editResult.message}
            </p>
          )}

          <div className="flex justify-around mt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
*/


export default function DashboardPage() {
  const router = useRouter();

  // State for logout functionality
  const [logoutResult, setLogoutResult] = useState<LogoutState>({ message: '' });
  const [isLoggingOut, startLogoutTransition] = useTransition();

  // State for calendar selected date
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // State for fetched bookings for the current user
  const [userBookings, setUserBookings] = useState<FetchedBookingsState>({ data: [], loading: true, error: null });
  const [isFetchingBookings, startFetchingTransition] = useTransition();

  // State for all globally booked dates (used for 'red' indication)
  const [globalBookedDates, setGlobalBookedDates] = useState<string[]>([]);
  const [isFetchingGlobalBookedDates, startFetchingGlobalTransition] = useTransition();

  // State for clearing past appointments
  const [clearAppointmentsState, setClearAppointmentsState] = useState<ClearAppointmentsState>({ message: '' });
  const [isClearing, startClearingTransition] = useTransition();

  // Removed state for edit modal and current booking to edit
  // const [showEditModal, setShowEditModal] = useState<boolean>(false);
  // const [currentBookingToEdit, setCurrentBookingToEdit] = useState<IBooking | null>(null);

  // State for user details
  const [userDetails, setUserDetails] = useState<UserDetailsState>({ name: null, email: null, success: false, message: '' });
  const [isFetchingUserDetails, startFetchingUserDetailsTransition] = useTransition();


  // useEffect to watch for the success state of the logout action
  useEffect(() => {
    if (logoutResult.success) {
      console.log(logoutResult.message);
      router.push('/login'); // Redirect to login page after successful logout
    }
  }, [logoutResult.success, router]);

  // Function to refresh current user's bookings
  const refreshBookings = () => {
    startFetchingTransition(async () => {
      setUserBookings(prev => ({ ...prev, loading: true, error: null }));
      const result = await fetchBookings();
      if (result.success && result.data) {
        // Sort bookings by date and then by start time before setting
        const sortedBookings = [...result.data].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) {
            return dateA - dateB;
          }
          // If dates are same, compare by start time (string comparison works for HH:MM)
          return a.startTime.localeCompare(b.startTime);
        });
        setUserBookings({ data: sortedBookings, loading: false, error: null });
      } else {
        setUserBookings({ data: [], loading: false, error: result.message || 'Failed to load bookings.' });
      }
    });
  };

  // Function to fetch all globally booked dates
  const fetchAndSetGlobalBookedDates = () => {
    startFetchingGlobalTransition(async () => {
      const result = await fetchGlobalBookedDates();
      if (result.success && result.data) {
        setGlobalBookedDates(result.data);
      } else {
        console.error('Failed to fetch global booked dates:', result.message);
        setGlobalBookedDates([]); // Ensure it's an empty array on error
      }
    });
  };

  // useEffect to fetch user details when the component mounts
  useEffect(() => {
    startFetchingUserDetailsTransition(async () => {
      const result = await fetchUserDetails();
      setUserDetails(result);
      // If fetching user details fails (e.g., not authenticated), redirect to login
      if (!result.success) {
        console.error('User details fetch failed, redirecting to login:', result.message);
        router.push('/login');
      }
    });
  }, [router]);


  // useEffect to fetch bookings and global booked dates when the component mounts
  useEffect(() => {
    refreshBookings(); // Initial fetch for current user's bookings
    fetchAndSetGlobalBookedDates(); // Initial fetch for all booked dates
  }, []); // Empty dependency array: runs once on mount.

  // Handler for the form submission for logout
  const handleLogout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startLogoutTransition(async () => {
      const result = await logout();
      setLogoutResult(result);
    });
  };

  // Handler for clearing past appointments
  const handleClearPastAppointments = async () => {
    // Replaced window.confirm with a message box using the chat UI
    // You'd replace this with your custom modal component if you have one
    const isConfirmed = window.confirm('Are you sure you want to clear all past appointments? This action cannot be undone.');

    if (isConfirmed) {
      startClearingTransition(async () => {
        const result = await clearPastAppointments();
        setClearAppointmentsState(result);
        if (result.success) {
          refreshBookings(); // Refresh the list of bookings after clearing
          fetchAndSetGlobalBookedDates(); // Also refresh global booked dates
        }
      });
    }
  };

  // Handler for deleting a single booking
  const handleDeleteBooking = async (bookingId: string) => {
    // Replaced window.confirm with a message box using the chat UI
    // You'd replace this with your custom modal component if you have one
    const isConfirmed = window.confirm('Are you sure you want to delete this appointment? This cannot be undone.');

    if (isConfirmed) {
      startFetchingTransition(async () => {
        setUserBookings(prev => ({ ...prev, loading: true, error: null }));
        const result = await deleteBooking(bookingId);
        if (result.success) {
          refreshBookings();
          fetchAndSetGlobalBookedDates(); // Also refresh global booked dates
        } else {
          setUserBookings(prev => ({ ...prev, loading: false, error: result.message }));
        }
      });
    }
  };

  // Removed handler for opening the edit modal
  // const handleEditBooking = (booking: IBooking) => {
  //   setCurrentBookingToEdit(booking);
  //   setShowEditModal(true);
  // };

  // Removed handler for closing the edit modal
  // const handleCloseEditModal = () => {
  //   setCurrentBookingToEdit(null);
  //   setShowEditModal(false);
  // };

  /**
   * Helper function to determine the time-based status of a booking.
   * @param {IBooking} booking The booking object.
   * @returns {'Complete' | 'Ongoing' | 'Upcoming'} The calculated time-based status.
   */
  const getBookingStatus = (booking: IBooking): 'Complete' | 'Ongoing' | 'Upcoming' => {
    const now = new Date();
    // Use 'America/Chicago' timezone for accurate "now" comparison
    const nowInUTC5 = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

    const bookingDate = new Date(booking.date);
    // Convert booking date to its UTC-5 equivalent for comparison
    const bookingDateInUTC5 = new Date(bookingDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));


    // Normalize dates to compare just the date part (midnight UTC-5)
    const todayMidnightInUTC5 = new Date(nowInUTC5);
    todayMidnightInUTC5.setHours(0, 0, 0, 0);

    const bookingDateMidnightInUTC5 = new Date(bookingDateInUTC5);
    bookingDateMidnightInUTC5.setHours(0, 0, 0, 0);

    // Get current time as HH:MM string for accurate time comparison on the current day in UTC-5.
    const currentHourUTC5 = nowInUTC5.getHours().toString().padStart(2, '0');
    const currentMinuteUTC5 = nowInUTC5.getMinutes().toString().padStart(2, '0');
    const currentTimeStringUTC5 = `${currentHourUTC5}:${currentMinuteUTC5}`;

    // --- Logic to Determine Time-Based Status ---

    // 1. Check if the booking date is entirely in the past (before today in UTC-5)
    if (bookingDateMidnightInUTC5 < todayMidnightInUTC5) {
      return 'Complete';
    }
    // 2. Check if the booking date is today (in UTC-5)
    else if (bookingDateMidnightInUTC5.getTime() === todayMidnightInUTC5.getTime()) {
      // For today's appointments, check times using UTC-5 times
      if (booking.endTime <= currentTimeStringUTC5) { // Appointment has finished today (in UTC-5)
        return 'Complete';
      } else if (booking.startTime <= currentTimeStringUTC5 && booking.endTime > currentTimeStringUTC5) { // Appointment is currently active (in UTC-5)
        return 'Ongoing';
      } else { // Appointment is later today (start time is in the future in UTC-5)
        return 'Upcoming';
      }
    }
    // 3. If the booking date is entirely in the future (after today in UTC-5)
    else { 
      return 'Upcoming';
    }
  };

  /**
   * Helper function to get the Tailwind CSS class for status text color.
   * Assigns colors based on the determined time-based status for visual cues.
   * @param {'Complete' | 'Ongoing' | 'Upcoming'} status The calculated status string.
   * @returns {string} Tailwind CSS class for text color.
   */
  const getStatusTextColorClass = (status: 'Complete' | 'Ongoing' | 'Upcoming'): string => {
    switch (status) {
      case 'Complete':
        return 'text-green-600'; // Green for completed appointments
      case 'Ongoing':
        return 'text-orange-600'; // Orange for currently ongoing appointments
      case 'Upcoming':
        return 'text-blue-600'; // Blue for future/upcoming appointments
      default:
        return 'text-gray-500'; // Fallback
    }
  };

  /**
   * Helper function to format time from "HH:MM" (24-hour) to "HH:MM AM/PM" (12-hour).
   * @param {string} time24hr String in "HH:MM" format.
   * @returns {string} Formatted time string in "HH:MM AM/PM".
   */
  const formatTimeTo12Hour = (time24hr: string): string => {
    const [hours, minutes] = time24hr.split(':').map(Number);
    const date = new Date(); // Use a dummy date to leverage toLocaleTimeString
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  /**
   * Custom tileClassName for react-calendar to apply custom CSS classes for coloring.
   * @param {object} props - Properties from react-calendar's tileClassName.
   * @param {Date} props.date - The date of the tile.
   * @param {string} props.view - The current view of the calendar ('month', 'year', etc.).
   * @returns {string | null} CSS class name(s) to apply to the tile, or null.
   */
  const getTileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const now = new Date();
      // Get current date (midnight) in UTC-5 timezone for accurate comparison
      const nowInUTC5 = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const todayMidnightInUTC5 = new Date(nowInUTC5.getFullYear(), nowInUTC5.getMonth(), nowInUTC5.getDate());

      // Normalize the calendar tile's date to UTC-5 for comparison
      const tileDateInUTC5 = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      tileDateInUTC5.setHours(0, 0, 0, 0);

      // Format tileDateInUTC5 toYYYY-MM-DD string for comparison with globalBookedDates
      const tileDateStringUTC5 = `${tileDateInUTC5.getFullYear()}-${String(tileDateInUTC5.getMonth() + 1).padStart(2, '0')}-${String(tileDateInUTC5.getDate()).padStart(2, '0')}`;

      // Filter appointments specific to the logged-in user for this tile's date
      const appointmentsOnThisDate = userBookings.data.filter(booking => {
        const bookingDate = new Date(booking.date);
        // Compare the booking's date (converted to UTC-5) with the tile's date (converted to UTC-5)
        const bookingDateInUTC5 = new Date(bookingDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        bookingDateInUTC5.setHours(0, 0, 0, 0);
        return bookingDateInUTC5.getTime() === tileDateInUTC5.getTime();
      });

      // --- Determine Class Name based on User's Appointments, Global Bookings, and Date ---
      if (appointmentsOnThisDate.length > 0) {
        // Condition for BLUE: The logged-in user has at least one appointment on this date.
        return 'has-my-appointment';
      } else if (globalBookedDates.includes(tileDateStringUTC5)) {
          // Condition for RED: No logged-in user appointments, but someone else has booked on this date.
          return 'date-taken-by-other';
      }
      else if (tileDateInUTC5.getTime() >= todayMidnightInUTC5.getTime()) {
        // Condition for GREEN: No logged-in user appointments, AND the date is today or in the future.
        // This marks it as potentially available for booking by the current user.
        return 'no-my-appointment-future';
      } else {
        // If no logged-in user appointments, and the date is in the past, apply gray class.
        // This date is not available for new bookings.
        return 'no-my-appointment-past';
      }
    }
    return null; // No custom class for views other than 'month'
  };


  // Filtered appointments for the selected calendar date
  const filteredAppointments = userBookings.data.filter(booking => {
    const bookingDate = new Date(booking.date);
    // Convert booking date to UTC-5 for comparison with selectedCalendarDate (which is also handled in UTC-5)
    const bookingDateInUTC5 = new Date(bookingDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    bookingDateInUTC5.setHours(0, 0, 0, 0);

    const selectedDateInUTC5 = new Date(selectedCalendarDate.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    selectedDateInUTC5.setHours(0, 0, 0, 0);

    return bookingDateInUTC5.getTime() === selectedDateInUTC5.getTime();
  });


  return (
    <div className="dashboard-page-container">
      <div className="dashboard-main-card">
        <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200">
          <h1 className="text-3xl font-extrabold text-gray-800">
            {isFetchingUserDetails ? 'Loading...' : `Welcome${userDetails.name ? ` ${userDetails.name}` : ''}!`}
          </h1>
          <form onSubmit={handleLogout}>
            <button
              type="submit"
              disabled={isLoggingOut}
              className="dashboard-button-logout"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </form>
        </div>

        {logoutResult.message && !logoutResult.success && (
          <p className="text-red-500 mt-2 text-center text-sm">{logoutResult.message}</p>
        )}

        {/* Calendar Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 text-center dashboard-section-heading">Select Date</h2>
          <div className="flex justify-center">
            <Calendar
              onChange={(value) => {
                if (value instanceof Date) {
                  setSelectedCalendarDate(value);
                } else if (Array.isArray(value) && value[0] instanceof Date) {
                  setSelectedCalendarDate(value[0]);
                }
              }}
              value={selectedCalendarDate}
              tileClassName={getTileClassName} 
            />
          </div>
          <p className="mt-4 text-center text-lg text-gray-600">
            Selected Date: <span className="font-semibold text-gray-800">
              {selectedCalendarDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </p>
        </div>

        {/* Action Buttons: Book New & Clear Past */}
        <div className="mb-8 text-center flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 dashboard-actions-group">
            <button
                onClick={() => router.push('/book-appointment')}
                className="dashboard-button-primary"
            >
                Book New Appointment
            </button>
            <button
                onClick={handleClearPastAppointments}
                disabled={isClearing} 
                className="dashboard-button-warning"
            >
                {isClearing ? 'Clearing Past...' : 'Clear Past Appointments'}
            </button>
        </div>
        {clearAppointmentsState.message && (
          <p className={`text-sm mt-2 text-center ${clearAppointmentsState.success ? 'text-green-600' : 'text-red-600'}`}>
            {clearAppointmentsState.message}
          </p>
        )}


        {/* Appointments for Selected Date Section */}
        <div className="p-6 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
          <h2 className="2xl font-semibold text-gray-700 mb-4 border-b pb-3 border-gray-200 dashboard-section-heading">
            Appointments on {selectedCalendarDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          {isFetchingBookings || userBookings.loading || isFetchingGlobalBookedDates ? (
            <p className="text-gray-500 text-center py-4">Loading appointments...</p>
          ) : userBookings.error ? (
            <p className="text-red-500 text-center py-4">Error: {userBookings.error}</p>
          ) : (isFetchingUserDetails && !userDetails.success) ? (
            <p className="text-gray-500 text-center py-4">Authenticating user...</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No appointments found for this date.</p>
          ) : (
            <ul className="space-y-4">
              {filteredAppointments.map((booking) => {
                const timeStatus = getBookingStatus(booking);
                const statusColorClass = getStatusTextColorClass(timeStatus);
                return (
                  <li key={booking._id.toString()} className="appointment-list-item flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="flex-grow">
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        {new Date(booking.date).toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-gray-700 text-base mb-1">
                        <span className="font-medium">Time:</span> {formatTimeTo12Hour(booking.startTime)} - {formatTimeTo12Hour(booking.endTime)}
                      </p>
                      {booking.details && (
                        <p className="text-gray-600 text-sm italic">
                          <span className="font-medium">Details:</span> {booking.details}
                        </p>
                      )}
                      <p className={`text-sm font-bold mt-2 ${statusColorClass}`}>Time Status: {timeStatus}</p>
                      
                      <p className="text-sm font-bold mt-1 text-gray-700">
                          DB Status: {booking.status ? (booking.status.charAt(0).toUpperCase() + booking.status.slice(1)) : 'N/A'}
                      </p>
                    </div>
                    
                    {/* Removed Edit button as requested */}
                    <div className="mt-4 sm:mt-0 flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2">
                      {/*
                      <button
                        onClick={() => handleEditBooking(booking)}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                      >
                        Edit
                      </button>
                      */}
                      <button
                        onClick={() => handleDeleteBooking(booking._id.toString())}
                        className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Removed Render Edit Booking Modal as requested */}
        {/*
        {showEditModal && currentBookingToEdit && (
          <EditBookingModal
            booking={currentBookingToEdit}
            onClose={handleCloseEditModal}
            onUpdateSuccess={() => { // Refresh both user and global bookings after successful update
                refreshBookings();
                fetchAndSetGlobalBookedDates();
            }}
          />
        )}
        */}

      </div>
    </div>
  );
}
