import dbConnect from '@/lib/dbConnect'; // Utility to connect to the database
import User from '@/models/User';       // Your Mongoose User model
import { NextRequest, NextResponse } from 'next/server'; // Next.js server utilities
import bcrypt from 'bcryptjs'; // Import bcryptjs for password hashing

/**
 * GET handler for /api/users
 * Fetches all users from the database.
 * @returns {NextResponse} A JSON response containing the users or an error message.
 */
export async function GET() {
  try {
    // Connect to the database
    await dbConnect();

    // Fetch all users from the database
    const users = await User.find({});

    // Return a successful response with the fetched users
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error: any) {
    // Log the error for debugging purposes
    console.error('Error fetching users:', error);
    // Return an error response
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch users' },
      { status: 500 } // Internal Server Error
    );
  }
}

/**
 * POST handler for /api/users
 * Creates a new user in the database.
 * @param {NextRequest} req The incoming request object, containing the user data in its body.
 * @returns {NextResponse} A JSON response containing the newly created user or an error message.
 */
export async function POST(req: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();

    // Parse the request body to get user data
    const body = await req.json();
    const { name, email, password } = body;

    // Basic validation: Check if required fields are present
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required.' },
        { status: 400 } // Bad Request
      );
    }

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Create a new user instance with the hashed password
    const newUser = await User.create({ name, email, password: hashedPassword });

    // Return a successful response with the newly created user
    return NextResponse.json({ success: true, data: newUser }, { status: 201 }); // 201 Created
  } catch (error: any) {
    // Log the error for debugging purposes
    console.error('Error creating user:', error);

    // Handle specific Mongoose errors, e.g., duplicate email
    if (error.code === 11000) { // MongoDB duplicate key error code
      return NextResponse.json(
        { success: false, message: 'Email already exists.' },
        { status: 409 } // Conflict
      );
    }

    // Return a generic error response for other issues
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create user' },
      { status: 500 } // Internal Server Error
    );
  }
}
