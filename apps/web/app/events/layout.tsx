import { AuthProvider } from "@/src/contexts/AuthContext";
import { Toaster } from "@/src/components/ui/Toast";

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
