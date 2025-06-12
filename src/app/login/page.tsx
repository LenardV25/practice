'use client';
// Removed import './log.css'; to rely solely on Tailwind CSS for styling

import { useState, useEffect, useTransition, useRef } from "react";
import { authenticate } from "./actions";
import { useRouter } from 'next/navigation';

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

export default function LoginForm() {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const router = useRouter();

    const [actionResult, setActionResult] = useState<FormState>({ message: '' });
    const [isPending, startTransition] = useTransition();

    const loginRegisterFormRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (actionResult.success && !isRegisterMode) {
            router.push('/dashboard');
        }
    }, [actionResult.success, isRegisterMode, router]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
            const result = await authenticate(undefined, formData);
            setActionResult(result);
        });
    };

    return (
        // Outermost container with full height, flex properties for centering, padding, and background
        // All styling is now handled by Tailwind CSS classes directly.
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-blue-50">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
                {isRegisterMode ? 'Register' : 'Login'}
            </h1>
            {/* Form with a distinct background color and a subtle border */}
            <form onSubmit={handleSubmit} ref={loginRegisterFormRef} 
                  className="bg-blue-50 border border-blue-200 p-8 rounded-lg shadow-xl w-full max-w-md mx-auto">
                <input type="hidden" name="formMode" value={isRegisterMode ? 'register' : 'login'} />

                {isRegisterMode && (
                    <div className="mb-4">
                        <input
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Full Name"
                            required={isRegisterMode}
                        />
                    </div>
                )}
                {actionResult?.errors?.name && (
                    <p className="text-red-500 text-sm mt-1">{actionResult.errors.name.join(', ')}</p>
                )}

                <div className="mb-4">
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        required
                    />
                </div>
                {actionResult?.errors?.email && (
                    <p className="text-red-500 text-sm mt-1">{actionResult.errors.email.join(', ')}</p>
                )}
                
                <div className="mb-6">
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Password"
                        required
                    />
                </div>
                {actionResult?.errors?.password && (
                    <p className="text-red-500 text-sm mt-1">{actionResult.errors.password.join(', ')}</p>
                )}

                {actionResult?.errors?.general && (
                    <p className="text-red-500 text-sm mt-2 font-bold text-center">{actionResult.errors.general.join(', ')}</p>
                )}

                {actionResult?.success && (
                    <p className="text-green-500 text-sm mt-2 font-bold text-center">
                        {actionResult.message}
                    </p>
                )}

                <SubmitButton isRegisterMode={isRegisterMode} isPending={isPending} />

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        {isRegisterMode ? (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRegisterMode(false);
                                        setActionResult({ message: '' });
                                        if (loginRegisterFormRef.current) loginRegisterFormRef.current.reset(); // Reset form fields
                                    }}
                                    className="text-blue-600 hover:underline font-medium focus:outline-none"
                                >
                                    Login here
                                </button>
                            </>
                        ) : (
                            <>
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRegisterMode(true);
                                        setActionResult({ message: '' });
                                        if (loginRegisterFormRef.current) loginRegisterFormRef.current.reset(); // Reset form fields
                                    }}
                                    className="text-blue-600 hover:underline font-medium focus:outline-none"
                                >
                                    Register here
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </form>
        </div>
    );
}

// Props interface for SubmitButton
interface SubmitButtonProps {
    isRegisterMode: boolean;
    isPending: boolean; // Add isPending prop to control button disabled state
}

function SubmitButton({ isRegisterMode, isPending }: SubmitButtonProps) {
    return (
        <div>
            <button
                // Applied Tailwind CSS classes directly for consistent styling
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full transition-colors duration-200"
                disabled={isPending}
                type="submit"
            >
                {/* Change button text based on mode and pending status */}
                {isPending ?
                    (isRegisterMode ? 'Registering...' : 'Logging in...') :
                    (isRegisterMode ? 'Register' : 'Login')
                }
            </button>
        </div>
    );
}
