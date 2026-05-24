# Self-Hosted PostgreSQL on Arch Linux

Host the EmberExchange database on your old Arch laptop. Teammates — and Render — connect using a shared `DATABASE_URL` in their `.env`.

---

## Prerequisites

- Arch Linux laptop with systemd
- Stable internet (ethernet preferred over Wi-Fi for 24/7 uptime)
- Router admin access (only if using direct port forwarding)
- A domain or Cloudflare account (free tier is fine)

---

## 1. Install & Configure PostgreSQL

```bash
sudo pacman -Syu
sudo pacman -S postgresql

# Initialize the database cluster
sudo -iu postgres initdb --locale en_US.UTF-8 -D /var/lib/postgres/data

# Enable and start
sudo systemctl enable --now postgresql
```

### Create the database and user

```bash
sudo -iu postgres psql <<'EOF'
CREATE USER ember WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE emberexchange OWNER ember;
\q
EOF
```

> **Generate a strong password:** `openssl rand -base64 32`

### Allow remote connections

```bash
# Listen on all interfaces
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" \
  /var/lib/postgres/data/postgresql.conf

# Authenticate remote clients with SCRAM-SHA-256 (stronger than md5)
sudo tee -a /var/lib/postgres/data/pg_hba.conf <<'EOF'

# EmberExchange remote access
hostssl emberexchange ember 0.0.0.0/0 scram-sha-256
hostssl emberexchange ember ::/0      scram-sha-256
EOF

sudo systemctl restart postgresql
```

### Enable SSL

PostgreSQL can use self-signed certs automatically:

```bash
sudo -iu postgres openssl req -new -x509 -days 365 -nodes -text \
  -out /var/lib/postgres/data/server.crt \
  -keyout /var/lib/postgres/data/server.key \
  -subj "/CN=ember-db"

sudo chmod 600 /var/lib/postgres/data/server.key
sudo chown postgres:postgres /var/lib/postgres/data/server.{crt,key}

sudo sed -i "s/#ssl = off/ssl = on/" /var/lib/postgres/data/postgresql.conf
sudo systemctl restart postgresql
```

---

## 2. Firewall

```bash
# Allow PostgreSQL
sudo ufw allow 5432/tcp
# Or with iptables:
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

# Block everything else incoming (if not already done)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
```

---

## 3. Choose Your Public Access Strategy

| Approach | Difficulty | Security | Best For |
|----------|-----------|----------|----------|
| **A. Cloudflare Tunnel** | Easy | ⭐⭐⭐ Excellent | Most teams |
| **B. Direct + Dynamic DNS** | Medium | ⭐⭐ Okay | Advanced users |

---

## Approach A: Cloudflare Tunnel (Recommended)

No port forwarding. No public IP exposure. Cloudflare proxies the connection.

### 1. Install `cloudflared`

```bash
yay -S cloudflared
# or manually:
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
```

### 2. Authenticate

```bash
cloudflared tunnel login
# Opens browser. Select your domain.
```

### 3. Create the tunnel

```bash
cloudflared tunnel create ember-db
# Note the Tunnel ID shown in output
```

### 4. Configure DNS

```bash
# Replace TUNNEL_ID with the ID from step 3
# Replace your-domain.com with your actual domain
cloudflared tunnel route dns ember-db db.your-domain.com
```

### 5. Create config

```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/YOURUSER/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: db.your-domain.com
    service: tcp://localhost:5432
  - service: http_status:404
EOF
```

### 6. Run as a service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

### 7. Connection string

```
postgresql://ember:STRONG_PASSWORD@db.your-domain.com:5432/emberexchange?sslmode=require
```

> Render and teammates use **exactly this URL**. Cloudflare handles the tunnel. Your laptop's IP is never exposed.

---

## Approach B: Direct Port Forwarding + Dynamic DNS

Use this if you can't or don't want to use Cloudflare.

### 1. Set up Dynamic DNS

Your home IP changes. Use a free DDNS service to get a stable hostname.

**Option: DuckDNS**

```bash
# Get a token at https://www.duckdns.org
# Replace YOURTOKEN and YOURSUBDOMAIN
sudo tee /usr/local/bin/duckdns.sh <<'EOF'
#!/bin/bash
curl -k "https://www.duckdns.org/update?domains=YOURSUBDOMAIN&token=YOURTOKEN&ip="
EOF
sudo chmod +x /usr/local/bin/duckdns.sh

# Run every 5 minutes
echo "*/5 * * * * root /usr/local/bin/duckdns.sh" | sudo tee /etc/cron.d/duckdns
```

Your database will be reachable at: `YOURSUBDOMAIN.duckdns.org`

### 2. Port Forward on Your Router

In your router admin panel:
- External port: `5432`
- Internal IP: your Arch laptop's local IP (e.g., `192.168.1.42`)
- Internal port: `5432`
- Protocol: TCP

Give your Arch laptop a **static DHCP lease** (reserve its MAC address → IP) so the local IP never changes.

### 3. Connection string

```
postgresql://ember:STRONG_PASSWORD@YOURSUBDOMAIN.duckdns.org:5432/emberexchange?sslmode=require
```

---

## 4. Seed the Database

On your Arch laptop, copy the project and run the seed script:

```bash
cd ~/emberexchange  # or wherever you cloned it
node scripts/seed-local-db.js
```

Or seed manually:

```bash
sudo -iu postgres psql -d emberexchange -f scripts/seed.sql
```

---

## 5. `.env` for Teammates & Render

Create a shared `.env` snippet:

```bash
# ============================================
# EmberExchange - Shared Database
# Host: your Arch laptop (24/7)
# ============================================
DATABASE_URL=postgresql://ember:STRONG_PASSWORD@db.your-domain.com:5432/emberexchange?sslmode=require
```

> **Never commit this to Git.** Share via password manager, Slack DM, or Render env vars.

### Render Deployment

In your Render dashboard:
1. Go to **Environment** → **Secret Files** or **Environment Variables**
2. Add: `DATABASE_URL` = the connection string above
3. Redeploy

Render connects over the internet just like any other client.

---

## 6. Backup Strategy

Your laptop is now the single source of truth. Back it up.

### Automatic daily dump

```bash
sudo mkdir -p /var/backups/postgres
sudo tee /usr/local/bin/pg-backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U ember -h localhost emberexchange | gzip > /var/backups/postgres/emberexchange_$DATE.sql.gz
find /var/backups/postgres -name "*.gz" -mtime +7 -delete
EOF
sudo chmod +x /usr/local/bin/pg-backup.sh

# Daily at 3 AM
echo "0 3 * * * postgres /usr/local/bin/pg-backup.sh" | sudo tee /etc/cron.d/pg-backup
```

### Sync to cloud (optional)

```bash
# Install rclone
sudo pacman -S rclone
rclone config  # set up Google Drive / Dropbox

# Add to backup script
rclone copy /var/backups/postgres remote:ember-backups
```

---

## 7. Monitoring & Uptime

### Auto-restart PostgreSQL if it crashes

Already handled by systemd (`systemctl enable postgresql`).

### Auto-restart Cloudflare tunnel

Already handled by systemd (`systemctl enable cloudflared`).

### Simple health check endpoint

On your Arch laptop, create a small HTTP health check:

```bash
sudo tee /usr/local/bin/db-health.sh <<'EOF'
#!/bin/bash
if pg_isready -h localhost -p 5432 -U ember > /dev/null; then
  echo "DB OK $(date)" >> /var/log/db-health.log
else
  echo "DB FAIL $(date)" >> /var/log/db-health.log
  sudo systemctl restart postgresql
fi
EOF
sudo chmod +x /usr/local/bin/db-health.sh
echo "*/5 * * * * root /usr/local/bin/db-health.sh" | sudo tee /etc/cron.d/db-health
```

---

## 8. Troubleshooting

### Can't connect from outside?

```bash
# On the Arch laptop
sudo ss -tlnp | grep 5432
# Should show *:5432

# Test from another machine
psql "postgresql://ember:PASSWORD@db.your-domain.com:5432/emberexchange?sslmode=require" -c "SELECT version();"
```

### PostgreSQL won't start?

```bash
sudo journalctl -u postgresql -n 50
sudo -iu postgres pg_ctl -D /var/lib/postgres/data status
```

### Cloudflare tunnel down?

```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -n 50
cloudflared tunnel info ember-db
```

### Laptop IP changed?

- Check DuckDNS/Cloudflare is updating
- Verify router DHCP reservation is set

---

## Security Checklist

- [ ] Strong random password (not `ember`)
- [ ] `scram-sha-256` auth (not `md5` or `trust`)
- [ ] SSL enabled (`ssl = on`)
- [ ] `pg_hba.conf` restricts to specific DB/user if possible
- [ ] Firewall only opens 5432 (and 22 for SSH)
- [ ] No root login over SSH (`PermitRootLogin no`)
- [ ] Backups running daily
- [ ] Laptop has UPS or battery backup

---

## Quick Reference

| Task | Command |
|------|---------|
| Restart DB | `sudo systemctl restart postgresql` |
| View logs | `sudo journalctl -u postgresql -f` |
| Connect locally | `sudo -iu postgres psql -d emberexchange` |
| Backup now | `sudo -iu postgres pg_dump emberexchange > backup.sql` |
| Restore | `sudo -iu postgres psql emberexchange < backup.sql` |
| Tunnel status | `sudo systemctl status cloudflared` |

---

## Which Approach Should You Use?

- **Cloudflare Tunnel (A)** if you want security, zero router config, and a clean domain name. Best for teams.
- **Direct + DDNS (B)** if you want absolute simplicity and don't mind router config. Acceptable for small trusted teams.

For Render deployments, **Cloudflare Tunnel is strongly recommended** because Render IPs change and a stable hostname avoids connection issues.
