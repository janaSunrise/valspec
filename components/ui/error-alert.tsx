import { cn } from '@/lib/utils';

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      className={cn('rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive', className)}
    >
      {message}
    </div>
  );
}
