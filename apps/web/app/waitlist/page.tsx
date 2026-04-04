import { permanentRedirect } from 'next/navigation';

/** Legacy URL — waitlist phase ended; send traffic to the app download page. */
export default function WaitlistPage() {
  permanentRedirect('/app');
}
