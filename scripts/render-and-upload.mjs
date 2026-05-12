/**
 * Runs inside GitHub Actions. Renders the Remotion composition and uploads
 * the MP4 to Cloudflare R2, then writes the public URL to /tmp/video_url.txt.
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createHash, createHmac } from "crypto";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storyId  = process.env.STORY_ID;
const title    = process.env.TITLE ?? "Indian Success Story";
const scenes   = JSON.parse(process.env.SCENES_JSON ?? "[]");

// ── R2 upload ─────────────────────────────────────────────────────────────────
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET     = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;
const ENDPOINT   = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

function hmac(key, data) {
  return createHmac("sha256", key).update(data).digest();
}
function sha256hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function uploadToR2(key, buffer, contentType) {
  const now      = new Date();
  const amzDate  = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256hex(buffer);
  const host     = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const uri      = `/${BUCKET}/${key}`;

  const canonicalHeaders =
    `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalReq  = ["PUT", uri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credScope     = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign  = ["AWS4-HMAC-SHA256", amzDate, credScope, sha256hex(canonicalReq)].join("\n");
  const sigKey        = hmac(hmac(hmac(hmac("AWS4" + SECRET_KEY, dateStamp), "auto"), "s3"), "aws4_request");
  const signature     = hmac(sigKey, stringToSign).toString("hex");
  const authHeader    =
    `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`${ENDPOINT}${uri}`, {
    method: "PUT",
    headers: { "Content-Type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, Authorization: authHeader },
    body: buffer,
  });
  if (!res.ok) throw new Error(`R2 upload failed [${res.status}]: ${await res.text()}`);
  return `${PUBLIC_URL}/${key}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
try {
  const entryPoint = path.join(__dirname, "../remotion/src/index.ts");
  const inputProps = { storyId, title, scenes };

  console.log(`Bundling Remotion composition for story: ${storyId}`);
  const bundled = await bundle({ entryPoint });

  const composition = await selectComposition({ serveUrl: bundled, id: "IndianSuccessStory", inputProps });

  const outPath = `/tmp/render-${storyId}.mp4`;
  console.log(`Rendering ${composition.durationInFrames} frames…`);
  await renderMedia({ composition, serveUrl: bundled, codec: "h264", outputLocation: outPath, inputProps });

  const buffer = await readFile(outPath);
  const key    = `stories/${storyId}/video/final.mp4`;
  console.log(`Uploading ${(buffer.length / 1024 / 1024).toFixed(1)} MB to R2…`);
  const url = await uploadToR2(key, buffer, "video/mp4");

  await writeFile("/tmp/video_url.txt", url);
  console.log(`Done: ${url}`);
} catch (err) {
  await writeFile("/tmp/render_error.txt", err.message ?? String(err));
  console.error(err);
  process.exit(1);
}
