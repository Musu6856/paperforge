"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="font-serif text-xl">PaperForge</span>
          <span className="rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-primary">
            Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            功能
          </a>
          <a href="#model-safety" className="transition-colors hover:text-foreground">
            模型与安全
          </a>
          <a href="#example" className="transition-colors hover:text-foreground">
            示例研究
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/launch"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                新研究
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" })
                )}
              >
                登录
              </Link>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
