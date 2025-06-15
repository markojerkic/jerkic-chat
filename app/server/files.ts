import { AwsClient } from "aws4fetch";
import type { AppLoadContext } from "react-router";

export async function generatePresignedUrl(
  ctx: AppLoadContext,
  objectKey: string,
  expiresInSeconds: number = 300,
) {
  try {
    const aws = new AwsClient({
      accessKeyId: ctx.cloudflare.env.R2_ACCESS_KEY_ID,
      secretAccessKey: ctx.cloudflare.env.R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto", // R2 uses "auto" as region
    });

    const url = new URL(`${ctx.cloudflare.env.R2_S3_URL}/${objectKey}`);

    // Add required parameters for presigned URL
    const now = new Date();

    url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
    url.searchParams.set("X-Amz-Expires", expiresInSeconds.toString());
    url.searchParams.set(
      "X-Amz-Date",
      now.toISOString().replace(/[:-]|\.\d{3}/g, ""),
    );

    const signedRequest = await aws.sign(url.toString(), {
      method: "GET",
      aws: {
        signQuery: true,
      },
    });

    console.log("Generated presigned URL:", signedRequest.url);
    return new URL(signedRequest.url);
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

export async function uploadToR2(
  ctx: AppLoadContext,
  fileId: string,
  file: File,
) {
  const isLocal = process.env.NODE_ENV === "development";
  console.log("isLocal", isLocal);

  if (isLocal) {
    // Use S3 API directly for local development
    const aws = new AwsClient({
      accessKeyId: ctx.cloudflare.env.R2_ACCESS_KEY_ID,
      secretAccessKey: ctx.cloudflare.env.R2_SECRET_ACCESS_KEY,
    });

    const url = new URL(`${ctx.cloudflare.env.R2_S3_URL}/${fileId}`);
    console.log("upload url", url.toString());

    const fileBuffer = await file.arrayBuffer();
    const typeInfo = getMimeTypeFromFilename(file.name);

    const response = await aws.fetch(url, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": typeInfo ?? "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to upload: ${response.status} ${response.statusText}`,
      );
    }

    return {
      success: true,
      key: fileId,
      etag: response.headers.get("etag"),
      size: file.size,
    };
  }

  // Use R2 binding for production
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

export function getMimeTypeFromFilename(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (!extension) {
    return "application/octet-stream"; // No extension found
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
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.document",
    csv: "text/csv",

    // Image types
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",

    // Audio types
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",

    // Video types
    mp4: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mov: "video/quicktime",

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
