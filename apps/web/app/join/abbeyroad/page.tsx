import { redirect } from 'next/navigation';

export default function AbbeyRoadJoinPage() {
  redirect('/signup?source=abbey_road_institute');
}
