import { Link } from "next-view-transitions";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { UserMenu } from "@/components/layout/user-menu";

import { Logo } from "./logo";

type NavbarProps = {
  border?: boolean;
};

export async function Navbar({ border = true }: NavbarProps) {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  const user = session?.user;

  return (
    <header className={cn("relative z-10", border && "border-b border-border")}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href={user ? "/dashboard" : "/"}>
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button size="sm">
              <Link href="/login" className="inline-flex items-center gap-1.5">
                Sign In
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          )}
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}
