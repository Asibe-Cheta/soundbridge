import { Toaster } from "@/src/components/ui/Toast";

export default function ProfileLayout({
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
