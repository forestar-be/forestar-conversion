"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExcelPreviewProps {
  headers: string[];
  rows: string[][];
}

export function ExcelPreview({ headers, rows }: ExcelPreviewProps) {
  const displayRows = rows.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Aperçu Excel (10 premières lignes)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px]">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="border border-border px-2 py-1 bg-muted text-left whitespace-nowrap font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => (
                  <tr key={ri}>
                    {headers.map((_, ci) => (
                      <td
                        key={ci}
                        className="border border-border px-2 py-1 whitespace-nowrap max-w-[200px] truncate"
                      >
                        {row[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
