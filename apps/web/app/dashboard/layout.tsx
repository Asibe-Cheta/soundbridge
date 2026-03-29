import { Toaster } from "@/src/components/ui/Toast";

/** Auth is provided once in root layout — do not nest AuthProvider here (breaks session after login). */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
