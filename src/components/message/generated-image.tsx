import { useParams } from "@tanstack/react-router";

type GeneratedImageProps = {
  imageKey: string;
  messageId: string;
};

export function GeneratedImage({ imageKey, messageId }: GeneratedImageProps) {
  const { threadId } = useParams({ strict: false });

  if (!threadId) {
    return null;
  }

  const imageUrl = `/thread/${threadId}/image/${messageId}?key=${encodeURIComponent(imageKey)}`;

  return (
    <figure className="my-4 overflow-hidden rounded-xl border bg-white shadow-sm">
      <img
        src={imageUrl}
        alt="Generated image"
        className="max-h-[70vh] w-full object-contain"
        loading="lazy"
      />
      <figcaption className="text-muted-foreground border-t px-3 py-2 font-mono text-xs">
        {imageKey}
      </figcaption>
    </figure>
  );
}

export function isGeneratedImageKey(content: string) {
  return /^tools\/image\/[a-z0-9]+$/.test(content.trim());
}
