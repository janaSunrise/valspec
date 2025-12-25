import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { GridPattern } from '@/components/layout/grid-pattern';
import { ArrowRight, Copy, Eye, EyeOff } from 'lucide-react';

function SecretRow({
  name,
  value,
  revealed = false,
  env,
}: {
  name: string;
  value: string;
  revealed?: boolean;
  env?: string;
}) {
  return (
    <div className="group flex items-center gap-4 border-b border-border px-4 py-2.5 transition-colors hover:bg-muted/50">
      <div className="w-32 shrink-0">
        <code className="text-xs font-medium text-foreground">{name}</code>
        {env && (
          <p className="mt-0.5 font-sans text-xs text-muted-foreground">
            from {env}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
        {revealed ? value : '•'.repeat(Math.min(value.length, 20))}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function AppPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/5">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="size-2 rounded-full bg-red-500" />
            <div className="size-2 rounded-full bg-yellow-500" />
            <div className="size-2 rounded-full bg-green-500" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">my-saas-app</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="rounded-md bg-primary/20 px-2 py-1 font-medium text-primary">
              production
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">12 secrets</span>
      </div>

      <div className="font-mono">
        <SecretRow name="DATABASE_URL" value="postgres://prod:***@db.ex.co" />
        <SecretRow name="REDIS_URL" value="redis://cache.ex.co:6379" revealed />
        <SecretRow name="STRIPE_KEY" value="sk_live_51ABC123..." />
        <SecretRow name="JWT_SECRET" value="kH9#mP2$vL5nQ8xR" env="staging" />
        <SecretRow name="API_URL" value="https://api.example.com" revealed />
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">Last sync 2m ago</span>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">Encrypted</span>
        </div>
      </div>
    </div>
  );
}

function Terminal() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-2 rounded-full bg-muted-foreground/30" />
          <div className="size-2 rounded-full bg-muted-foreground/30" />
          <div className="size-2 rounded-full bg-muted-foreground/30" />
        </div>
      </div>

      <div className="p-4 font-mono text-sm">
        <div className="flex items-center gap-2">
          <span className="text-primary">$</span>
          <span className="text-muted-foreground">curl -H</span>
          <span className="text-amber-500">&quot;Authorization: $SHADE_KEY&quot;</span>{' '}
          <span className="text-foreground">api.shade.dev/v1/secrets</span>
        </div>

        <div className="mt-3 text-sm">
          <span className="text-muted-foreground">{'{'}</span>
          <div className="ml-4">
            <span className="text-primary">&quot;DATABASE_URL&quot;</span>
            <span className="text-muted-foreground">: </span>
            <span className="text-green-600 dark:text-green-400">&quot;postgres://...&quot;</span>
          </div>
          <div className="ml-4">
            <span className="text-primary">&quot;STRIPE_KEY&quot;</span>
            <span className="text-muted-foreground">: </span>
            <span className="text-green-600 dark:text-green-400">&quot;sk_live_...&quot;</span>
          </div>
          <span className="text-muted-foreground">{'}'}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-primary">$</span>
          <span className="inline-block h-4 w-1.5 bg-foreground" />
        </div>
      </div>
    </div>
  );
}

function EnvBadge({
  name,
  color,
  count,
}: {
  name: string;
  color: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <span className="text-sm text-muted-foreground">{count}</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background font-mono">
      <GridPattern />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center">
            <h1 className="mb-6 text-3xl font-bold tracking-tight lg:text-4xl">
              Environment variables, <span className="text-muted-foreground">done right.</span>
            </h1>
            <p className="mb-8 max-w-md text-lg text-muted-foreground">
              One place for all your secrets. Multiple projects, environments
              with inheritance, version history, and a simple API for your CI/CD.
            </p>

            <div className="flex items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/login">
                  Start building
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#" className="font-mono text-sm">
                  shade.dev/api/v1
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative" id="preview">
            <div className="absolute -inset-4 rounded-2xl bg-linear-to-b from-primary/10 to-transparent" />
            <AppPreview />
          </div>
        </div>

        <div className="mt-24 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Environments
            </p>
            <div className="space-y-2">
              <EnvBadge name="development" color="#22c55e" count={24} />
              <EnvBadge name="staging" color="#eab308" count={24} />
              <EnvBadge name="production" color="#ef4444" count={18} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Staging inherits from development
            </p>
          </div>

          <div className="lg:col-span-2">
            <Terminal />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
