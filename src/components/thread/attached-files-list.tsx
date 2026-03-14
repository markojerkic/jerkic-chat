import { useFormContext, useWatch } from "react-hook-form";
import { AttachingFile } from "../message/attachment-files";
import type { ChatMessage } from "./thread";

export function AttachedFilesList() {
  const form = useFormContext<ChatMessage>();
  // Have to use because of the compiler
  const files = useWatch<ChatMessage>({
    defaultValue: form.getValues("files"),
    name: "files",
  }) as ChatMessage["files"];

  const onRemoveFile = (fileId: string) => {
    form.setValue(
      "files",
      form.getValues("files")?.filter((f) => f.id !== fileId),
    );
    console.log("set files", form.getValues("files"));
  };

  if (!files) return;

  return (
    <div className="flex items-start gap-2 overflow-x-auto px-4 py-1">
      {files.map((selectedFile) => (
        <AttachingFile
          file={selectedFile.file}
          id={selectedFile.id}
          key={selectedFile.id}
          onRemove={() => onRemoveFile(selectedFile.id)}
        />
      ))}
    </div>
  );
}
