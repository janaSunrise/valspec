import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { GridPattern } from '@/components/layout/grid-pattern';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background font-mono">
      <GridPattern />
      <Navbar border={false} />

      <main className="relative z-10 flex flex-1 items-center justify-center px-6">{children}</main>

      <Footer />
    </div>
  );
}
