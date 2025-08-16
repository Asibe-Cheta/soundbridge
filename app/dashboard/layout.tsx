import { AuthProvider } from "@/src/contexts/AuthContext";
import { Toaster } from "@/src/components/ui/Toast";

export default function DashboardLayout({
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
