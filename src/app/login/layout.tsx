// src/app/login/layout.tsx
import React from 'react';

// This layout is specific to the /login route segment.
// It should NOT contain <html> or <body> tags, as those are handled by the root app/layout.tsx.
// It simply provides a wrapper for the content of app/login/page.tsx.

interface LoginLayoutProps {
  children: React.ReactNode;
}

export default function LoginLayout({ children }: LoginLayoutProps) {
  return (
    // This layout will just pass through children.
    // The main styling and centering will be handled directly in app/login/page.tsx
    // to avoid potential nested flex container issues.
    <>{children}</>
  );
}
