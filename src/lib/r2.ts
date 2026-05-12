/**
 * Cloudflare R2 upload helper using the S3-compatible API via fetch.
 * Avoids pulling the full AWS SDK — keeps bundle size small.
 */

import crypto from "crypto";

const ACCOUNT_ID   = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID!;
const SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET       = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL   = process.env.R2_PUBLIC_URL!; // e.g. https://pub-xxx.r2.dev

const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

function hmac(key: Buffer | string, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256hex(data: Buffer | string) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(dateStamp: string) {
  const kDate    = hmac("AWS4" + SECRET_KEY, dateStamp);
  const kRegion  = hmac(kDate, "auto");
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const now = new Date();
  const amzDate  = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash  = sha256hex(body);
  const host         = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${BUCKET}/${key}`;

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(dateStamp);
  const signature  = hmac(signingKey, stringToSign).toString("hex");

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`${ENDPOINT}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authHeader,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed [${res.status}]: ${text}`);
  }

  return `${PUBLIC_URL}/${key}`;
}
