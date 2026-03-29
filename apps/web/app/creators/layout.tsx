import { Toaster } from "@/src/components/ui/Toast";

export default function CreatorsLayout({
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
