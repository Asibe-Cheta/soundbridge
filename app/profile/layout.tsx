import { AuthProvider } from "@/src/contexts/AuthContext";
import { Toaster } from "@/src/components/ui/Toast";

export default function ProfileLayout({
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
