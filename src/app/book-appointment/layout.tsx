// app/book-appointment/layout.tsx
import React from 'react';

interface BookAppointmentLayoutProps {
  children: React.ReactNode;
}

export default function BookAppointmentLayout({ children }: BookAppointmentLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {children}
    </div>
  );
}