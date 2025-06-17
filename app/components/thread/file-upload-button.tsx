import { Paperclip } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import type { ChatMessage } from "./thread";

type FileUploadButtonProps = {
  onFilesSelected: (files: File[]) => void;
};

const MAX_FILES = 3;

export function FileUploadButton({ onFilesSelected }: FileUploadButtonProps) {
  const form = useFormContext<ChatMessage>();
  const controler = useController<ChatMessage>({
    name: "files",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const currentFileCount = form.getValues("files")?.length || 0;
      if (currentFileCount + e.target.files.length > MAX_FILES) {
        toast.error(`You can only upload ${MAX_FILES} files per message`);
        return;
      }
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <>
      <input
        className="hidden"
        type="file"
        name="files"
        multiple
        id="files"
        onChange={handleFileChange}
      />
      <Button
        className="-mb-1.5 inline-flex h-auto items-center justify-center gap-2 rounded-full border border-solid border-secondary-foreground/10 bg-transparent px-2 py-1.5 pr-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground/50 max-sm:p-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
        aria-label="Attach files"
        type="button"
        disabled={controler.fieldState.invalid}
        onClick={() => document.getElementById("files")!.click()}
      >
        <Paperclip className="size-4" />
      </Button>
    </>
  );
}
