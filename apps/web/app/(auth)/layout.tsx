import { Toaster } from "@/src/components/ui/Toast";

/** Auth is provided once in root layout — nested AuthProvider caused login → dashboard bounce. */
export default function AuthLayout({
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
