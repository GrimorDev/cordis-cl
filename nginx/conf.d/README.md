# SSL Certificates

Place your SSL certificates in `nginx/ssl/`:

```
nginx/ssl/
├── fullchain.pem    # Full certificate chain (cert + intermediates)
└── privkey.pem      # Private key
```

## Using Let's Encrypt (recommended)

On your VPS, run:

```bash
apt install certbot
certbot certonly --standalone -d cordis.app -d api.cordis.app

# Certificates will be at:
# /etc/letsencrypt/live/cordis.app/fullchain.pem
# /etc/letsencrypt/live/cordis.app/privkey.pem
```

Then copy or symlink them:
```bash
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/cordis.app/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/cordis.app/privkey.pem nginx/ssl/
```

## Auto-renewal

Add to crontab:
```cron
0 0 1 * * certbot renew --quiet && docker compose restart nginx
```
