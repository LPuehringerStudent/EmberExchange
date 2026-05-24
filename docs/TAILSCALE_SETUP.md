# Tailscale Setup for EmberExchange DB

Exposes your Arch laptop's Postgres to teammates and Render via an encrypted mesh VPN. No router config needed.

---

## 1. Install Tailscale on Your Arch Laptop

```bash
sudo pacman -S tailscale
sudo systemctl enable --now tailscaled
sudo tailscale up
```

A browser link appears. Log in with Google/GitHub/Microsoft. Done.

### Get your Tailscale IP

```bash
tailscale ip -4
# Example output: 100.64.25.7
```

Write this down — it's your laptop's stable address on the tailnet.

---

## 2. Allow Postgres to Accept Tailscale Connections

Tailscale gives your laptop an IP in the `100.64.0.0/10` range. Update `pg_hba.conf`:

```bash
sudo tee -a /var/lib/postgres/data/pg_hba.conf <<'EOF'

# Tailscale mesh network
hostssl emberexchange ember 100.64.0.0/10 scram-sha-256
host    emberexchange ember 100.64.0.0/10 scram-sha-256
EOF

sudo systemctl restart postgresql
```

> `host` (without SSL) is a fallback for Render's Tailscale sidecar if SSL cert verification is tricky. Keep `hostssl` as the primary.

---

## 3. Firewall — Allow Tailscale Interface

Tailscale creates a `tailscale0` interface. Allow Postgres only on that interface (not the public internet):

```bash
# Check your Tailscale interface
ip addr show tailscale0

# Allow Postgres on tailscale0 only
sudo iptables -A INPUT -i tailscale0 -p tcp --dport 5432 -j ACCEPT

# Block Postgres on other interfaces (if not already blocked)
sudo iptables -A INPUT -p tcp --dport 5432 -j DROP
```

Or with `ufw`:
```bash
sudo ufw allow in on tailscale0 to any port 5432
sudo ufw deny 5432/tcp
```

---

## 4. Verify Connectivity from Another Machine

From any machine on the same tailnet:

```bash
psql "postgresql://ember:PASSWORD@100.64.25.7:5432/emberexchange" -c "SELECT version();"
```

Replace `100.64.25.7` with your laptop's actual Tailscale IP.

---

## 5. Connect Render to Tailscale

Render supports Tailscale as a **native environment**.

### In the Render Dashboard

1. Go to your **Web Service** → **Environment**
2. Click **Add Environment** → **Native**
3. Select **Tailscale**
4. Follow the OAuth flow to authorize Render into your tailnet
5. Render gets a Tailscale IP automatically

### Update Render env vars

```bash
DATABASE_URL=postgresql://ember:l9dEkkM-hCAiNrw_K5fWR0R6qVEuaQur8j4k1tijGis@100.64.25.7:5432/emberexchange?sslmode=disable
```

Replace `100.64.25.7` with your laptop's Tailscale IP.

Deploy. Render now connects to your laptop over WireGuard.

---

## 6. Share the Tailnet with Teammates

### Option A: Same Tailscale account (simplest)

Send teammates the Tailscale login. Everyone joins the same tailnet.

```bash
# Teammate install
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --login-server https://controlplane.tailscale.com
# Log in with the same account
```

### Option B: Tailscale Shared Nodes (granular)

Share only the laptop node, not the whole tailnet:

```bash
# On your Arch laptop
sudo tailscale serve --https=443 --set-path=/pgstatus off  # optional
```

In the [Tailscale admin panel](https://login.tailscale.com/admin/machines):
1. Find your laptop (`arch-laptop`)
2. Click **⋯** → **Edit**
3. Under **Sharing**, enable **Shared node**
4. Add teammates by email

Teammates get access to `100.64.25.7:5432` without seeing your other devices.

---

## 7. `.env` for Everyone

```bash
# ============================================
# EmberExchange — Tailscale Network
# Laptop DB node: 100.64.25.7
# ============================================
DATABASE_URL=postgresql://ember:l9dEkkM-hCAiNrw_K5fWR0R6qVEuaQur8j4k1tijGis@100.64.25.7:5432/emberexchange?sslmode=disable
```

> **Never commit this.** Share via 1Password / Bitwarden / Slack DM.

---

## 8. Keep It Running 24/7

### Auto-start Tailscale

Already handled by `systemctl enable tailscaled`.

### Auto-start PostgreSQL

Already handled by `systemctl enable postgresql`.

### Laptop sleep settings

Prevent sleep when lid is closed (if a laptop):

```bash
sudo tee -a /etc/systemd/logind.conf <<'EOF'
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
EOF
sudo systemctl restart systemd-logind
```

### Wi-Fi power save off

```bash
sudo tee /etc/NetworkManager/dispatcher.d/99-wifi-powersave-off <<'EOF'
#!/bin/bash
if [ "$1" = "wlan0" ] && [ "$2" = "up" ]; then
  iw dev wlan0 set power_save off
fi
EOF
sudo chmod +x /etc/NetworkManager/dispatcher.d/99-wifi-powersave-off
```

---

## 9. Monitoring

Check if the node is online from anywhere:

```bash
tailscale status
# or
tailscale ping 100.64.25.7
```

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| `tailscale up` hangs | Check internet, run `sudo tailscale up --reset` |
| Can't connect to Postgres | Verify `pg_hba.conf` has `100.64.0.0/10`, restart postgres |
| Render can't reach DB | Verify Render's Tailscale env is connected in dashboard |
| Tailscale IP changed | It shouldn't, but check with `tailscale ip -4` |
| Laptop goes to sleep | Check `logind.conf` lid settings |
| Connection drops overnight | Check Wi-Fi power save, switch to ethernet if possible |

---

## Quick Commands

```bash
# Laptop status
tailscale status
tailscale ip -4

# Restart tailscale
sudo systemctl restart tailscaled

# Test DB from this machine
psql "postgresql://ember:PASSWORD@100.64.25.7:5432/emberexchange" -c "SELECT 1"

# View tailscale logs
sudo journalctl -u tailscaled -f
```

---

## Security Notes

- Tailscale traffic is WireGuard-encrypted end-to-end
- Postgres is only reachable inside the tailnet (not the public internet)
- ACLs in the Tailscale admin panel can restrict which nodes talk to which
- Rotate the Postgres password if a teammate leaves the project
