import MyBookingsClient from '@/src/components/bookings/MyBookingsClient';

export const metadata = {
  title: 'My Bookings · SoundBridge',
};

export default function BookingsPage() {
  return (
    <main
      className="main-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      <MyBookingsClient />
    </main>
  );
}


