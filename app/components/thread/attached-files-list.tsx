import { AttachingFile } from "../message/attachment-files";

type AttachedFilesListProps = {
  files: Array<{ id: string; file: File }>;
  messageId: string;
  onRemoveFile: (fileId: string) => void;
};

export function AttachedFilesList({
  files,
  messageId,
  onRemoveFile,
}: AttachedFilesListProps) {
  if (!files.length) return null;

  return (
    <div className="flex items-start gap-2 overflow-x-auto px-4 py-1">
      {files.map((selectedFile) => (
        <AttachingFile
          file={selectedFile.file}
          id={selectedFile.id}
          key={selectedFile.id}
          messageId={messageId}
          onRemove={() => onRemoveFile(selectedFile.id)}
        />
      ))}
    </div>
  );
}
