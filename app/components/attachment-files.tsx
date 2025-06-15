import { FileUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

export function UploadedFile({
  id,
  fileName,
}: {
  fileName: string;
  id: string;
}) {
  return (
    <div className="relative grid max-w-[200px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-solid border-secondary-foreground/10 px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 max-sm:p-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
      <FileUp className="size-4 grow" />
      <span className="truncate">{fileName}</span>
    </div>
  );
}

export function AttachingFile({
  file,
  id,
  messageId,
  onRemove,
}: {
  file: File;
  id: string;
  messageId: string;
  onRemove?: () => void;
}) {
  const [isUploaded, setIsUploaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const fetcher = useFetcher();

  useEffect(() => {
    if (progress > 0) return; // prevent multiple submissions

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileId", id);
    formData.append("messageId", messageId);

    // Start simulated progress
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 5 : prev));
    }, 100);

    // Submit and handle completion
    fetcher
      .submit(formData, {
        method: "post",
        action: `/file`,
        encType: "multipart/form-data",
      })
      .then(() => {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setIsUploaded(true), 500);
      })
      .catch((error) => {
        clearInterval(interval);
        setProgress(0);
        console.error("Upload failed:", error);
      });

    return () => clearInterval(interval);
  }, [file, id, messageId, fetcher, progress]);

  return (
    <div className="relative grid max-w-[200px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-solid border-secondary-foreground/10 px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 max-sm:p-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
      <FileUp className="size-4 grow" />
      <span className="truncate">{file.name}</span>
      <Button
        variant="ghost"
        type="button"
        size="sm"
        className="h-[28px] w-[28px] p-1.5"
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>

      <Progress
        className={`absolute right-0 bottom-0 left-0 h-1 w-full transition-opacity duration-300 ${
          isUploaded ? "opacity-0" : "opacity-100"
        }`}
        value={progress}
      />
    </div>
  );
}
