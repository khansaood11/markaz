import { redirect } from 'next/navigation';

export default function AdminDashboard() {
  // The main dashboard now redirects to the prayer timings page by default.
  redirect('/admin/timings');
}
