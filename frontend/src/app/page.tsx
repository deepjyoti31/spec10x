/**
 * Spec10x — Home Page Redirect
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
