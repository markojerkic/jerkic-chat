import { FileUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "./ui/button";

export function UploadedFile({
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
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state !== "idle" || isUploaded) {
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileId", id);
    formData.append("messageId", messageId);
    fetcher
      .submit(formData, {
        method: "post",
        action: `/file`,
        encType: "multipart/form-data",
      })
      .then(() => {
        setIsUploaded(true);
      });
  }, [file, id]);

  return (
    <div className="grid max-w-[200px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-solid border-secondary-foreground/10 px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 max-sm:p-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
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
    </div>
  );
}
