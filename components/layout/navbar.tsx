import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { getUser } from '@/lib/auth';
import { ArrowRight } from 'lucide-react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { cn } from '@/lib/utils';

interface NavbarProps {
  border?: boolean;
}

export async function Navbar({ border = true }: NavbarProps) {
  const user = await getUser();

  return (
    <header className={cn('relative z-10', border && 'border-b border-border')}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href={user ? '/dashboard' : '/'}>
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground">{user.email}</span>
              <SignOutButton />
            </>
          ) : (
            <>
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
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
