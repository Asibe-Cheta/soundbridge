import { redirect } from 'next/navigation';

export default function SoundAcademyJoinPage() {
  redirect('/signup?source=sound_academy');
}
