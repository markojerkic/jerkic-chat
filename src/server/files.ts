import type { AppLoadContext } from "react-router";

export async function uploadToR2(
  ctx: AppLoadContext,
  fileId: string,
  file: File,
) {
  // Use R2 binding directly
  const fileBuffer = await file.arrayBuffer();
  const typeInfo = getMimeTypeFromFilename(file.name);

  const response = await ctx.cloudflare.env.upload_files.put(
    fileId,
    fileBuffer,
    {
      httpMetadata: {
        contentType: typeInfo ?? "application/octet-stream",
      },
    },
  );

  if (!response) {
    throw new Error("Failed to upload file to R2");
  }

  return response;
}

export async function getFileFromR2(
  ctx: AppLoadContext,
  fileId: string,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const object = await ctx.cloudflare.env.upload_files.get(fileId);

  if (!object) {
    throw new Error(`File not found: ${fileId}`);
  }

  const buffer = await object.arrayBuffer();
  const contentType =
    object.httpMetadata?.contentType ?? "application/octet-stream";

  return { buffer, contentType };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function getMimeTypeFromFilename(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (!extension) {
    return "application/octet-stream";
  }

  const mimeTypes: { [key: string]: string } = {
    // Common document types
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    csv: "text/csv",
    md: "text/markdown",

    // Programming files
    ts: "text/typescript",
    tsx: "text/typescript",
    jsx: "text/javascript",
    py: "text/x-python",
    java: "text/x-java-source",
    cpp: "text/x-c++src",
    c: "text/x-csrc",
    h: "text/x-chdr",
    cs: "text/x-csharp",
    php: "text/x-php",
    rb: "text/x-ruby",
    go: "text/x-go",
    rs: "text/x-rust",
    swift: "text/x-swift",
    kt: "text/x-kotlin",
    scala: "text/x-scala",
    sh: "text/x-shellscript",
    sql: "text/x-sql",
    yaml: "text/yaml",
    yml: "text/yaml",
    toml: "text/x-toml",

    // Image types
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    tiff: "image/tiff",
    tif: "image/tiff",

    // Audio types
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",

    // Video types
    mp4: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",

    // Archive types
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    "7z": "application/x-7z-compressed",

    // Other common types
    bin: "application/octet-stream",
    exe: "application/x-msdownload",
    dmg: "application/x-apple-diskimage",
    iso: "application/x-iso9660-image",
  };

  return mimeTypes[extension] ?? "application/octet-stream";
}

// Helper function to determine if a file should be treated as text
export function isTextFile(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript"
  );
}

// Helper function to get appropriate data URL prefix
export function getDataUrlPrefix(mimeType: string): string {
  return `data:${mimeType};base64,`;
}
