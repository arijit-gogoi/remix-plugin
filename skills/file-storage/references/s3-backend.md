# S3 File Storage

```ts
import { createS3FileStorage } from 'remix/file-storage-s3'

const storage = createS3FileStorage({
  bucket:          process.env.S3_BUCKET!,
  region:          process.env.AWS_REGION!,
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  prefix:          'uploads/',          // optional — key prefix in the bucket
  endpoint:        process.env.S3_ENDPOINT,  // optional — for MinIO, R2, B2
})
```

## Credentials

The backend uses the standard AWS SDK chain:

1. Explicit `accessKeyId` / `secretAccessKey` from the config.
2. Environment variables (`AWS_ACCESS_KEY_ID`, …).
3. Shared credentials file (`~/.aws/credentials`).
4. IAM role (EC2, ECS, EKS, Lambda).

In production, prefer IAM roles — don't ship long-lived access keys in env.

## S3-compatible providers

Pass `endpoint` for non-AWS S3:

```ts
// Cloudflare R2
createS3FileStorage({
  bucket:          'my-bucket',
  region:          'auto',
  endpoint:        'https://<account>.r2.cloudflarestorage.com',
  accessKeyId:     '…',
  secretAccessKey: '…',
})

// MinIO (local dev)
createS3FileStorage({
  bucket:          'dev-uploads',
  region:          'us-east-1',
  endpoint:        'http://localhost:9000',
  forcePathStyle:  true,
  accessKeyId:     'minioadmin',
  secretAccessKey: 'minioadmin',
})
```

## Lifecycle rules

S3 doesn't care if files become orphaned. Configure lifecycle rules on the bucket:

- Expire keys under `tmp/` after 7 days (for half-finished uploads).
- Transition older versions to Glacier.
- Block public access at the bucket level (use signed URLs, never `acl: 'public-read'`).

## Serving uploads — three options

### 1. Stream through your server

```ts
async show({ params }) {
  const file = await storage.get(params.key)
  if (!file) return new Response('Not found', { status: 404 })
  return new Response(file.stream(), {
    headers: {
      'Content-Type':  file.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
```

Simple, but every download passes through your origin's CPU and bandwidth.

### 2. Signed URLs

Generate a short-lived signed URL and redirect:

```ts
async show({ params }) {
  const url = await storage.signGetUrl(params.key, { expiresIn: 60 })
  return redirect(url)
}
```

S3 serves the bytes directly to the browser. Recommended for large/popular files.

### 3. CDN in front

Front the bucket with CloudFront (or R2's public domain, B2's CDN, etc.). Your app stores keys; the browser fetches `https://cdn.example.com/<key>`. Best price/performance.

## Multipart uploads

The backend uses multipart uploads automatically for files over 8 MB. Each part is 5 MB; final assembly happens server-side at S3. Failed multipart uploads leave incomplete parts — configure a lifecycle rule to clean them up.

## Costs

Three line items: storage GB/month, requests (PUT/GET/LIST), egress. For high-egress workloads, CloudFront (or any CDN) is dramatically cheaper than direct S3 reads.
