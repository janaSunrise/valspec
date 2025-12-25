import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowRight } from 'lucide-react';

export function Navbar() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Button size="sm" asChild>
            <Link href="/login">
              Open app
              <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
