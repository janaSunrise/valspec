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
    <div className="group flex items-center gap-4 border-b border-border/50 px-4 py-3 transition-colors hover:bg-white/[0.02]">
      <div className="w-40 shrink-0">
        <code className="text-[13px] text-foreground">{name}</code>
        {env && (
          <p className="mt-0.5 font-sans text-[10px] text-muted-foreground/60">
            from {env}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1 font-mono text-[13px] text-muted-foreground">
        {revealed ? value : '•'.repeat(Math.min(value.length, 32))}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button className="rounded p-1.5 text-muted-foreground/60 transition-colors hover:bg-white/5 hover:text-muted-foreground">
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button className="rounded p-1.5 text-muted-foreground/60 transition-colors hover:bg-white/5 hover:text-muted-foreground">
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function AppPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card/30 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-white/10" />
            <div className="size-2.5 rounded-full bg-white/10" />
            <div className="size-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="rounded bg-white/5 px-2 py-0.5">my-saas-app</span>
            <span className="text-muted-foreground/30">/</span>
            <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">
              production
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/40">12 secrets</span>
        </div>
      </div>

      <div className="font-mono">
        <SecretRow name="DATABASE_URL" value="postgres://prod:****@db.example.com:5432/app" />
        <SecretRow name="REDIS_URL" value="redis://prod-cache.example.com:6379" revealed />
        <SecretRow name="STRIPE_SECRET_KEY" value="sk_live_51ABC123DEF456..." />
        <SecretRow name="JWT_SECRET" value="a]kH9#mP2$vL5nQ8" env="staging" />
        <SecretRow name="NEXT_PUBLIC_API_URL" value="https://api.example.com" revealed />
        <SecretRow name="SENTRY_DSN" value="https://abc123@sentry.io/456" />
      </div>

      <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground/40">
          <span>Last sync 2m ago</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-green-500/60" />
          <span className="text-[10px] text-muted-foreground/40">Encrypted</span>
        </div>
      </div>
    </div>
  );
}

function Terminal() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card/30">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-white/10" />
          <div className="size-2.5 rounded-full bg-white/10" />
          <div className="size-2.5 rounded-full bg-white/10" />
        </div>
        <span className="text-[10px] text-muted-foreground/40">zsh</span>
      </div>
      <div className="p-4 font-mono text-[13px]">
        <div className="flex items-center gap-2 text-muted-foreground/60">
          <span className="text-primary">~</span>
          <span>curl -H &quot;Authorization: Bearer $SHADE_KEY&quot; \</span>
        </div>
        <div className="ml-6 text-muted-foreground/60">
          https://api.shade.dev/v1/secrets/production
        </div>
        <div className="mt-3 text-muted-foreground/40">
          <span className="text-green-400/70">{'{'}</span>
          <span className="text-muted-foreground/30">&quot;DATABASE_URL&quot;</span>
          <span>: </span>
          <span className="text-amber-400/70">&quot;postgres://...&quot;</span>
          <span className="text-green-400/70">{'}'}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-primary">~</span>
          <span className="inline-block h-4 w-2 animate-pulse bg-muted-foreground/40" />
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
    <div className="flex items-center justify-between rounded-md border border-border/50 bg-card/20 px-3 py-2.5 transition-colors hover:bg-card/40">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm">{name}</span>
      </div>
      <span className="text-xs text-muted-foreground/40">{count}</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background font-mono">
      <GridPattern />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 pb-12 pt-12">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground/60">
              Secrets Management
            </p>
            <h1 className="mb-6 font-sans text-4xl font-semibold tracking-tight lg:text-5xl">
              Environment variables,
              <br />
              <span className="text-muted-foreground">done right.</span>
            </h1>
            <p className="mb-8 max-w-md font-sans text-muted-foreground">
              One place for all your secrets. Multiple projects, environments
              with inheritance, version history, and a simple API for your CI/CD.
            </p>

            <div className="flex items-center gap-3">
              <Button className="h-10" asChild>
                <Link href="/login">
                  Start building
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button variant="outline" className="h-10 font-mono text-xs" asChild>
                <Link href="#preview">
                  shade.dev/api/v1
                </Link>
              </Button>
            </div>

            <div className="mt-12 flex gap-12">
              <div>
                <p className="text-2xl font-semibold">256-bit</p>
                <p className="text-xs text-muted-foreground/60">AES-GCM</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">&lt;50ms</p>
                <p className="text-xs text-muted-foreground/60">API latency</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">∞</p>
                <p className="text-xs text-muted-foreground/60">Version history</p>
              </div>
            </div>
          </div>

          <div className="relative" id="preview">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent opacity-60" />
            <AppPreview />
          </div>
        </div>

        <div className="mt-24 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-card/20 p-5">
            <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground/60">
              Environments
            </p>
            <div className="space-y-2">
              <EnvBadge name="development" color="#22c55e" count={24} />
              <EnvBadge name="staging" color="#eab308" count={24} />
              <EnvBadge name="production" color="#ef4444" count={18} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground/40">
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
