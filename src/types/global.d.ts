// src/types/global.d.ts

// Import Mongoose's main type to correctly type the connection object
import { Mongoose } from 'mongoose';

// Extend the NodeJS.Global interface to add your custom 'mongoose' property
declare global {
  namespace NodeJS {
    interface Global {
      mongoose: {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      };
    }
  }
}

// This empty export makes the file a module, which is often necessary
// for TypeScript to pick up global declarations correctly in some setups.
export {};