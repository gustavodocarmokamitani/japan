import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const REMOVED_KEY = "removed.json";

// Same credentials scripts/publish-r2.mjs uses, read here at request time
// instead of from .env.local (that script loads .env.local itself; this runs
// inside Next.js, which already loads it in dev and reads real env vars in
// production).
function getClient() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2 credentials (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

async function streamToString(body: unknown): Promise<string> {
  // The SDK types this as a union of Node stream / web stream / Blob
  // depending on runtime; Next.js API routes run on Node, where it's always
  // a Readable with an async iterator.
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

interface RemovedEntry {
  id: string;
  removedAt: string;
}

// A missing removed.json (nothing removed yet) is the normal starting state,
// not an error — everything else propagates.
async function readRemovedEntries(): Promise<RemovedEntry[]> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("Missing R2_BUCKET");
  try {
    const res = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: REMOVED_KEY }));
    const text = await streamToString(res.Body);
    return JSON.parse(text) as RemovedEntry[];
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") return [];
    throw error;
  }
}

export async function getRemovedIds(): Promise<Set<string>> {
  const entries = await readRemovedEntries();
  return new Set(entries.map((entry) => entry.id));
}

export async function addRemovedId(id: string): Promise<void> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("Missing R2_BUCKET");
  const entries = await readRemovedEntries();
  if (entries.some((entry) => entry.id === id)) return;
  entries.push({ id, removedAt: new Date().toISOString() });
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: REMOVED_KEY,
      Body: JSON.stringify(entries, null, 2),
      ContentType: "application/json",
    }),
  );
}
