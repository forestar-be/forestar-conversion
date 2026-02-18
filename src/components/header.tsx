"use client";

import Link from "next/link";
import Image from "next/image";
import { useHeaderConfig } from "@/components/header-context";

export function Header() {
  const { config } = useHeaderConfig();

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="container mx-auto px-4 h-12 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/logo-70x70.png"
            alt="Forestar"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="text-base font-bold">Forestar Conversion</span>
        </Link>
        {config.title && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-base font-semibold">{config.title}</span>
          </>
        )}
        {config.subtitle && (
          <span className="text-xs text-muted-foreground">
            ({config.subtitle})
          </span>
        )}
        {config.rightContent && (
          <div className="ml-auto">{config.rightContent}</div>
        )}
      </div>
    </header>
  );
}
