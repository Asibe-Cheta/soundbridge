import { Toaster } from "@/src/components/ui/Toast";

export default function MessagingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>
        {children}
      </main>
      <Toaster />
    </>
  );
}
