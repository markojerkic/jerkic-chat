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
  console.log("env", process.env.NODE_ENV);

  if (isLocal) {
    // Use S3 API directly for local development
    const aws = new AwsClient({
      accessKeyId: ctx.cloudflare.env.R2_ACCESS_KEY_ID,
      secretAccessKey: ctx.cloudflare.env.R2_SECRET_ACCESS_KEY,
    });

    const url = new URL(`${ctx.cloudflare.env.R2_S3_URL}/${fileId}`);
    console.log("upload url", url.toString());

    const fileBuffer = await file.arrayBuffer();

    const response = await aws.fetch(url, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": file.type,
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
  const response = await ctx.cloudflare.env.upload_files.put(
    fileId,
    fileBuffer,
    {
      httpMetadata: {
        contentType: file.type,
      },
    },
  );

  if (!response) {
    throw new Error("Failed to upload file to R2");
  }

  return response;
}
