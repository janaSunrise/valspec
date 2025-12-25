'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      <LogOut className="mr-1.5 size-3" />
      Sign out
    </Button>
  );
}
