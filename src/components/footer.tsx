import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Image
          src="/logo-70x70.png"
          alt="Forestar"
          width={16}
          height={16}
          className="rounded opacity-60"
        />
        <span>© {new Date().getFullYear()} Forestar — Outils internes</span>
      </div>
    </footer>
  );
}
