import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

export function Logo({ className, size = 'md' }: LogoProps) {
  return (
    <span className={cn('font-mono font-medium tracking-tight', sizes[size], className)}>
      shade<span className="text-primary">_</span>
    </span>
  );
}
