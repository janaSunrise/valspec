import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { GridPattern } from "@/components/layout/grid-pattern";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <GridPattern />
      <Navbar border={false} />
      <main className="relative z-10 flex flex-1 items-center justify-center px-6">{children}</main>
      <Footer />
    </div>
  );
}
