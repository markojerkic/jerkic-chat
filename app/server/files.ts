import { AwsClient } from "aws4fetch";
import type { AppLoadContext } from "react-router";

export async function generatePresignedUrl(
  ctx: AppLoadContext,
  objectKey: string,
  expiresInSeconds: number = 300, // 5 minutes default
) {
  const aws = new AwsClient({
    accessKeyId: ctx.cloudflare.env.R2_ACCESS_KEY_ID,
    secretAccessKey: ctx.cloudflare.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const url = new URL(`${ctx.cloudflare.env.R2_S3_URL}/${objectKey}`);

  // Specify a custom expiry for the presigned URL, in seconds
  url.searchParams.set("X-Amz-Expires", `${expiresInSeconds}`);

  const signedRequest = await aws.sign(url, {
    method: "GET",
    aws: {
      signQuery: true,
    },
  });

  console.log("signed request", signedRequest.url);

  return new URL(signedRequest.url);
}
