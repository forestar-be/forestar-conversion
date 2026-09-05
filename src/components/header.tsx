import Link from "next/link";
import Image from "next/image";

export function Header() {
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
      </div>
    </header>
  );
}
