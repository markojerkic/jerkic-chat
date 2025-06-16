import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

type FileUploadButtonProps = {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
  maxFiles: number;
  currentFileCount: number;
};

export function FileUploadButton({
  onFilesSelected,
  disabled,
  maxFiles,
  currentFileCount,
}: FileUploadButtonProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (currentFileCount + e.target.files.length > maxFiles) {
        toast.error(`You can only upload ${maxFiles} files per message`);
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
        disabled={disabled}
        onClick={() => document.getElementById("files")!.click()}
      >
        <Paperclip className="size-4" />
      </Button>
    </>
  );
}
