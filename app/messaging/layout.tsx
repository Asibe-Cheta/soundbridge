import { AuthProvider } from "@/src/contexts/AuthContext";
import { Toaster } from "@/src/components/ui/Toast";

export default function MessagingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <main>
        {children}
      </main>
      <Toaster />
    </AuthProvider>
  );
}
