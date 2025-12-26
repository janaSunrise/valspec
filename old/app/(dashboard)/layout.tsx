import { Navbar } from "@/components/layout/navbar";
import { QueryProvider } from "@/providers/query-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <QueryProvider>{children}</QueryProvider>
      </main>
    </div>
  );
}
