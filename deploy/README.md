# Deploying Stox Server to EC2

## 1. Launch an EC2 instance

- AMI: Amazon Linux 2023 or Ubuntu 22.04 LTS
- Instance type: `t3.small` (minimum) — `t3.medium` recommended for Puppeteer stability
- Storage: 20 GB gp3
- Security group: open inbound TCP 3001 (or put it behind a load balancer on 443)
- Key pair: create/select one so you can SSH in

## 2. SSH into the instance

```bash
ssh -i your-key.pem ec2-user@<your-instance-ip>   # Amazon Linux
ssh -i your-key.pem ubuntu@<your-instance-ip>      # Ubuntu
```

## 3. Run the setup script

```bash
REPO_URL=https://github.com/you/stox.git bash <(curl -fsSL https://raw.githubusercontent.com/you/stox/main/deploy/setup.sh)
```

Or copy the script manually and run:

```bash
REPO_URL=https://github.com/you/stox.git bash setup.sh
```

This will:
- Install Chrome/Puppeteer system dependencies
- Install Node 22 via nvm
- Install PM2 and configure it to start on boot
- Clone the repo, install deps, build the server
- Start the server under PM2

## 4. Verify it's running

```bash
pm2 status
pm2 logs stox-server
curl http://localhost:3001/api/stock/AAPL
```

## 5. Open the port (Security Group)

In the AWS console, add an inbound rule to your instance's security group:
- Type: Custom TCP
- Port: 3001
- Source: your frontend's IP, or `0.0.0.0/0` if public

## Ongoing operations

| Task | Command |
|---|---|
| View logs | `pm2 logs stox-server` |
| Restart server | `pm2 restart stox-server` |
| Deploy new code | `git -C ~/stox pull && npx tsc -p tsconfig.server.json && pm2 restart stox-server` |
| Check status | `pm2 status` |
| Invalidate cache | `rm ~/stox/server/.stock-cache.json && pm2 restart stox-server` |

## Notes

- The interactive terminal dashboard (`metrics.ts`) is disabled in production via `STOX_NO_DASHBOARD=true`. Logs go to `~/stox/logs/` instead.
- Puppeteer downloads its own Chromium on first `npm ci` — no separate Chrome install needed.
- The cache file lives at `~/stox/server/.stock-cache.json` (4h TTL). It persists across restarts.
- For HTTPS, put an ALB or nginx in front and proxy to port 3001.
