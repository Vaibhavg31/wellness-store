# Chikit — Coming Soon

Static, dependency-free landing page for **chikit.in** (Ayurvedic wellness brand).
No build step required — plain HTML/CSS/JS in `index.html` + `assets/`.

> The full Chikit store (React + backend) will be rebuilt on this branch step by
> step. The previous full storefront template lives on the
> `archive/full-wellness-store` branch for reference. This branch (`master`)
> starts from the coming-soon page only.

## Run locally

Just open `index.html` in a browser, or serve it:

```bash
npx serve .
```

## Structure

```
index.html          # page markup
assets/style.css     # layout, theme, animations
assets/script.js      # bokeh particle background, progress bar, notify form
assets/favicon.svg
.github/workflows/deploy.yml   # CI: pushes this folder to S3 + invalidates CloudFront
```

## Deploying to AWS (free tier)

This repo ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
syncs this folder straight to an S3 bucket on every push to `master`, and
optionally invalidates a CloudFront distribution. It does **not** run yet —
it needs AWS credentials and a bucket, which aren't set up here.

### One-time AWS setup (do this in your AWS account)

1. **S3 bucket** — create a bucket (e.g. `chikit-site`), enable **Static
   website hosting**, set `index.html` as the index document.
2. **Bucket policy** — allow public read (or, better, keep it private and
   front it with CloudFront using an Origin Access Control).
3. **CloudFront (recommended)** — create a distribution pointing at the S3
   bucket, attach your `chikit.in` domain + an ACM certificate (free), and
   point your domain's DNS at the CloudFront distribution.
4. **IAM user for CI** — create an IAM user (or OIDC role) with permission
   to `s3:PutObject`/`s3:DeleteObject`/`s3:ListBucket` on the bucket and
   `cloudfront:CreateInvalidation` on the distribution. Generate an access
   key for it.

### Wire it up to this repo

Add these as **GitHub repo secrets** (Settings → Secrets and variables →
Actions):

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | from the IAM user above |
| `AWS_SECRET_ACCESS_KEY` | from the IAM user above |
| `AWS_REGION` | e.g. `ap-south-1` |
| `AWS_S3_BUCKET` | your bucket name, e.g. `chikit-site` |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | optional — leave unset to skip the invalidation step |

Once those secrets exist, every push to `master` deploys automatically.
Nothing else in this repo needs to change.

## Not included (on purpose)

No backend pipeline yet. The PHP backend (and its planned migration to
Node) stays parked on `archive/full-wellness-store` until the store rebuild
begins — this branch is frontend-only, coming-soon page only.
