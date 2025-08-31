import { AuthProvider } from "@/src/contexts/AuthContext";
import { ThemeProvider } from "@/src/contexts/ThemeContext";
import { Toaster } from "@/src/components/ui/Toast";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
