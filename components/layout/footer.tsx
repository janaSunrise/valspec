import { Logo } from '@/components/logo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-border/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-xs">
          <Logo size="sm" />
          <span>— secure secrets for developers</span>
        </div>
        <p className="text-xs text-muted-foreground/80">© {year} Sunrit Jana</p>
      </div>
    </footer>
  );
}
