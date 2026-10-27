# Deploying Chikit to AWS

Pushing to `master` builds one Docker image (storefront + API), stores it in ECR and rolls it out on ECS. No keys are stored in GitHub: the workflow signs in to AWS with OIDC.

```
git push master ──▶ GitHub Actions ──▶ ECR (image) ──▶ ECS service ──▶ EC2 t3.micro ──▶ RDS MySQL
                    .github/workflows/deploy.yml       cluster "chikit"   http://<fixed IP>
```

| Piece | What | Free-tier note |
|---|---|---|
| ECS on EC2 | cluster `chikit`, service `chikit-web`, one `t3.micro` (Fargate is *not* free-tier) | 750 h/month for 12 months |
| RDS | MySQL `db.t3.micro`, 20 GB, private, 7-day backups | 750 h + 20 GB for 12 months |
| ECR | image repo `chikit` (keeps newest 8) | 500 MB |
| S3 | private bucket with `prod.env` (production settings) | 5 GB |
| Elastic IP | fixed public address | covered by the EC2 free tier while attached |

## One-time setup

1. Sign in to AWS on your machine: `aws login` (or `aws configure`).
2. Run `bash infra/aws/setup.sh` (about 15 minutes; mostly waiting for RDS). Safe to re-run.
3. Add the five GitHub repository variables it prints (Settings → Secrets and variables → Actions → Variables).
4. Push to `master` (or Actions → *Deploy to AWS* → Run workflow). The first run also loads the starter database (`database/chikit.sql`).

The Studio admin login is written to `~/chikit-admin-login.txt` (outside the repo).

## Production settings

Runtime settings live in `s3://chikit-config-<account>/prod.env` (and a private copy at `~/.chikit-aws/prod.env`). Add Razorpay, Brevo, MSG91 and Google keys there as `KEY=value` lines (same names as `config.json`), upload it, then re-run the workflow to restart the app:

```
aws s3 cp ~/.chikit-aws/prod.env s3://chikit-config-<account>/prod.env
```

Browser-visible `VITE_*` values (site URL, Razorpay key id, Google client id, MSG91 widget) are baked in at build time, so set them as GitHub repository variables with the same names.

## Good to know

- **HTTP only for now.** Razorpay live mode and Google sign-in need HTTPS. Point your domain at the fixed IP, then put HTTPS in front (an Application Load Balancer + ACM certificate, or Caddy on the instance) and update `FRONTEND_URL` / `VITE_SITE_URL`.
- **Short blip on deploy.** One small instance means the old container stops before the new one starts (about 30-60 s). A bad release rolls back automatically.
- **Uploads** (product photos) are stored on the instance disk (`/opt/chikit/uploads`). They survive deploys and reboots, but not terminating the instance, so back that folder up or move uploads to S3 before relying on it.
- **Sitemap / pre-rendered SEO pages** are not generated in CI (they need the live catalogue). The site itself is unaffected.
- Logs: CloudWatch Logs group `/ecs/chikit`. Shell access without SSH: AWS Systems Manager → Session Manager on the `chikit-ecs` instance.
