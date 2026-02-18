import Link from "next/link";
import { CONVERSIONS } from "@/lib/conversions/registry";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        Sélectionnez un outil pour convertir vos fichiers.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONVERSIONS.map((c) => (
          <Link key={c.slug} href={`/conversions/${c.slug}`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {c.title}
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant="outline">{c.from}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline">{c.to}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
