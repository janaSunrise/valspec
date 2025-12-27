import { Link } from "next-view-transitions";
import { ArrowRight, Copy, Eye, EyeOff, GitBranch, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { GridPattern } from "@/components/layout/grid-pattern";

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
    <div className="group flex items-center gap-4 border-b border-border/50 px-4 py-2.5 transition-colors hover:bg-muted/30">
      <div className="w-32 shrink-0">
        <code className="text-xs font-medium text-foreground">{name}</code>
        {env && (
          <p className="mt-0.5 flex items-center gap-1 font-sans text-xs text-muted-foreground">
            <GitBranch className="size-2.5" />
            {env}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
        {revealed ? value : "•".repeat(Math.min(value.length, 20))}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function AppPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/80" />
            <div className="size-2.5 rounded-full bg-yellow-500/80" />
            <div className="size-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
              my-saas-app
            </span>
            <span className="text-muted-foreground/30">/</span>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 font-medium text-primary">
              production
            </span>
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">12 secrets</span>
      </div>

      {/* Secrets list */}
      <div className="font-mono">
        <SecretRow name="DATABASE_URL" value="postgres://prod:***@db.ex.co" />
        <SecretRow name="REDIS_URL" value="redis://cache.ex.co:6379" revealed />
        <SecretRow name="STRIPE_KEY" value="sk_live_51ABC123..." />
        <SecretRow name="JWT_SECRET" value="kH9#mP2$vL5nQ8xR" env="staging" />
        <SecretRow name="API_URL" value="https://api.example.com" revealed />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">Last sync 2m ago</span>
        <div className="flex items-center gap-1.5">
          <Lock className="size-3 text-green-500" />
          <span className="text-xs text-muted-foreground">Encrypted</span>
        </div>
      </div>
    </div>
  );
}

function Terminal() {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-muted-foreground/20" />
          <div className="size-2.5 rounded-full bg-muted-foreground/20" />
          <div className="size-2.5 rounded-full bg-muted-foreground/20" />
        </div>
        <span className="ml-2 text-xs text-muted-foreground">terminal</span>
      </div>

      <div className="p-4 font-mono text-sm">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-green-500">$</span>
          <span className="text-muted-foreground">curl -H</span>
          <span className="text-amber-500">&quot;Authorization: $VALSPEC_KEY&quot;</span>
          <span className="text-foreground">api.valspec.dev/v1/secrets</span>
        </div>

        <div className="mt-4 text-sm">
          <span className="text-muted-foreground/70">{"{"}</span>
          <div className="ml-4 space-y-0.5">
            <div>
              <span className="text-primary">&quot;DATABASE_URL&quot;</span>
              <span className="text-muted-foreground/70">: </span>
              <span className="text-green-400">&quot;postgres://...&quot;</span>
              <span className="text-muted-foreground/70">,</span>
            </div>
            <div>
              <span className="text-primary">&quot;STRIPE_KEY&quot;</span>
              <span className="text-muted-foreground/70">: </span>
              <span className="text-green-400">&quot;sk_live_...&quot;</span>
            </div>
          </div>
          <span className="text-muted-foreground/70">{"}"}</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground" />
        </div>
      </div>
    </div>
  );
}

function EnvBadge({ name, color, count }: { name: string; color: string; count: number }) {
  return (
    <div className="group flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-3 transition-all hover:border-border hover:bg-card/80 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="size-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform group-hover:scale-110"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
        />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-border/50 bg-card/30 p-6 transition-all hover:border-border hover:bg-card/50 hover:shadow-lg hover:shadow-black/5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      {children}
      <p className="mt-4 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <GridPattern />
      <Navbar border={false} />
      <main className="relative z-10 flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          {/* Hero Section */}
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center">
              <h1 className="mb-6 text-4xl font-bold tracking-tight lg:text-5xl">
                Environment variables,{" "}
                <span className="bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  done right.
                </span>
              </h1>

              <p className="mb-8 max-w-md text-lg leading-relaxed text-muted-foreground">
                One place for all your secrets. Multiple projects, environments with inheritance,
                version history, and a simple API for your CI/CD.
              </p>

              <Link href="/login">
                <Button size="lg">
                  Start building
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>

            <div className="relative" id="preview">
              <div className="absolute -inset-4 rounded-2xl bg-linear-to-b from-primary/20 via-primary/5 to-transparent blur-xl" />
              <div className="relative">
                <AppPreview />
              </div>
            </div>
          </div>

          <div className="mt-32 grid gap-6 lg:grid-cols-3">
            <FeatureCard
              icon={GitBranch}
              title="Environments"
              description="Staging inherits from development, production stays isolated."
            >
              <div className="space-y-2">
                <EnvBadge name="development" color="#22c55e" count={24} />
                <EnvBadge name="staging" color="#eab308" count={24} />
                <EnvBadge name="production" color="#ef4444" count={18} />
              </div>
            </FeatureCard>

            <div className="lg:col-span-2">
              <Terminal />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
