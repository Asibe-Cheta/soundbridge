import { AuthProvider } from "@/src/contexts/AuthContext";
import { Header } from "@/src/components/layout/Header";
import { Toaster } from "@/src/components/ui/Toast";

export default function CreatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <Header />
      <main className="pt-16">
        {children}
      </main>
      <Toaster />
    </AuthProvider>
  );
}
