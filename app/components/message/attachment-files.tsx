import { FileUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

export function AttachedFiles({
  files,
  messageId,
}: {
  files: {
    id: string;
    fileName: string;
  }[];
  messageId: string;
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          className="relative inline-flex max-w-fit justify-items-start gap-2 rounded-lg px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap"
          variant="secondary"
        >
          <FileUp className="size-4 grow" />
          <span>
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex flex-col gap-2 p-2">
          {files.map((file) => (
            <UploadedFile messageId={messageId} file={file} key={file.id} />
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
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

function UploadedFile({
  messageId,
  file,
}: {
  file: { fileName: string; id: string };
  messageId: string;
}) {
  return (
    <Button
      className="rounded-lg border border-solid border-secondary-foreground/10 bg-muted/20 px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 max-sm:p-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
      asChild
    >
      <a
        href={`/file/${messageId}/${file.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex gap-2"
      >
        <FileUp className="size-4 grow" />
        <span className="truncate">{file.fileName}</span>
      </a>
    </Button>
  );
}
