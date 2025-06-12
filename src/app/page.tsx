// app/page.tsx
import { redirect } from 'next/navigation';

export default function RootRedirectPage() {
  // This page will immediately redirect to /login
  redirect('/login');
}