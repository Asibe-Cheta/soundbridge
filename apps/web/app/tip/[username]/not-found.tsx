import Link from 'next/link';

export default function TipRoomNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-5 text-center text-white">
      <h1 className="text-2xl font-semibold">Creator not found</h1>
      <p className="mt-2 max-w-sm text-gray-400">
        This tip link may be invalid or the creator account no longer exists.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-2.5 text-sm font-medium"
      >
        Go to SoundBridge
      </Link>
    </div>
  );
}
