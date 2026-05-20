import { redirect } from 'next/navigation';

/** Legacy /resources URL → Pro Resources hub */
export default function ResourcesPage() {
  redirect('/pro-resources');
}
