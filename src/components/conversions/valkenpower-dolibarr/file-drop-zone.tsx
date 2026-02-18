"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface FileDropZoneProps {
  onFileLoaded: (content: string, fileName: string) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileDropZone({
  onFileLoaded,
  accept = ".xml",
  disabled = false,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileLoaded(content, file.name);
      };
      reader.readAsText(file, "UTF-8");
    },
    [onFileLoaded, disabled],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <Card
      className={`relative border-2 border-dashed transition-colors cursor-pointer ${
        isDragOver
          ? "border-primary bg-primary/5"
          : fileName
            ? "border-green-500 bg-green-500/5"
            : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
        <Upload
          className={`h-10 w-10 ${
            fileName ? "text-green-500" : "text-muted-foreground"
          }`}
        />
        {fileName ? (
          <p className="text-sm text-green-700 font-medium">{fileName}</p>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Glisser-déposer un fichier XML ici
            </p>
            <p className="text-xs text-muted-foreground/75 mt-1">
              ou cliquer pour sélectionner
            </p>
          </div>
        )}
        <input
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={disabled}
          aria-label="Sélectionner un fichier XML"
        />
      </CardContent>
    </Card>
  );
}
