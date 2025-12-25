'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signUp } from '@/lib/auth-client';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await signUp.email({
          email,
          password,
          name,
        });
        if (error) {
          setError(error.message || 'Failed to create account');
          return;
        }
      } else {
        const { error } = await signIn.email({
          email,
          password,
        });
        if (error) {
          setError(error.message || 'Invalid credentials');
          return;
        }
      }
      router.push('/dashboard');
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xs">
      <div className="mb-8">
        <h1 className="mb-2 font-sans text-xl font-medium tracking-tight">
          {isSignUp ? 'Create account' : 'Sign in'}
        </h1>
        <p className="text-sm text-muted-foreground/60">
          {isSignUp ? 'Enter your details below' : 'Enter your credentials'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {isSignUp && (
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-xs uppercase tracking-widest text-muted-foreground/60"
            >
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              autoComplete="name"
              disabled={isLoading}
              className="h-10 bg-card/30 font-sans"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs uppercase tracking-widest text-muted-foreground/60"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            disabled={isLoading}
            className="h-10 bg-card/30 font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs uppercase tracking-widest text-muted-foreground/60"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            disabled={isLoading}
            className="h-10 bg-card/30 font-sans"
          />
        </div>

        <Button type="submit" className="h-10 w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {isSignUp ? 'Create account' : 'Continue'}
              <ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground/40">
        {isSignUp ? 'Have an account?' : 'No account?'}{' '}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {isSignUp ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </div>
  );
}
