import jwt, { Secret, SignOptions, VerifyOptions } from 'jsonwebtoken'; // Import Secret, SignOptions, VerifyOptions types

// Define the shape of the data we'll store in the JWT payload
// This should contain enough information to identify the user
interface AuthTokenPayload {
  userId: string;
  email: string;
  // Add other properties you might need, e.g., role: string;
}

// Get JWT secret from environment variables as a string
const JWT_SECRET_STRING = process.env.JWT_SECRET;

if (!JWT_SECRET_STRING) {
  // CRITICAL FOR PRODUCTION: Throw an error if the secret is not set.
  // For development, we'll log a warning and use a fallback.
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is not set! Using fallback for development. THIS IS NOT SECURE FOR PRODUCTION.');
  // In a production environment, you might want to uncomment `process.exit(1);`
  // process.exit(1);
}

// Convert the secret string to a Buffer.
// This ensures it matches the `Buffer` part of the `Secret` type in jsonwebtoken,
// providing a more robust type match and avoiding potential string overload issues.
const secretOrBuffer: Secret = Buffer.from(
  JWT_SECRET_STRING || 'fallback_secret_for_dev_only_replace_me', // Fallback string used to create Buffer
  'utf8' // Specify encoding
);

/**
 * Signs a new JWT token with the provided payload.
 * @param payload The data to include in the token (e.g., userId, email).
 * @param expiresIn Optional: Token expiration time (e.g., '1h', '7d'). Defaults to '1d'.
 * @returns The signed JWT token string.
 */
export async function signToken(payload: AuthTokenPayload, expiresIn: string = '1d'): Promise<string> {
  return new Promise((resolve, reject) => {
    // Pass the Buffer-based secret. Explicitly cast options for clarity.
    jwt.sign(payload, secretOrBuffer, { expiresIn } as SignOptions, (err, token) => {
      if (err) {
        console.error('Error signing token:', err);
        return reject(err);
      }
      if (!token) {
        return reject(new Error('Token generation failed.'));
      }
      resolve(token);
    });
  });
}

/**
 * Verifies a JWT token and returns its decoded payload.
 * @param token The JWT token string to verify.
 * @returns The decoded payload of the token.
 * @throws Error if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  return new Promise((resolve, reject) => {
    // Pass the Buffer-based secret. Pass an empty options object explicitly.
    jwt.verify(token, secretOrBuffer, {} as VerifyOptions, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return reject(err); // e.g., TokenExpiredError, JsonWebTokenError
      }
      // Ensure the decoded payload matches our expected interface
      if (decoded && typeof decoded === 'object' && 'userId' in decoded && 'email' in decoded) {
        resolve(decoded as AuthTokenPayload);
      } else {
        reject(new Error('Invalid token payload.'));
      }
    });
  });
}
