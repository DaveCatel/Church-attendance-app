# Deploying Church Attendance

This is a practical checklist for putting the app on a real server. Nothing here is needed
for development on your own computer.

## 1. Where to host it

The simplest setup for one church is **one small Linux server (VPS)** that runs everything:
PostgreSQL, the API, and a web server (Caddy) that serves the website and handles HTTPS.
1 vCPU and 1-2 GB of memory is plenty.

- Choose a data centre in **Europe** (Paris, Frankfurt, London). From Cameroon that is
  usually closer, so pages load faster, than the US.
- Alternative: a managed platform (Render, Railway, Fly.io) for the API plus a managed
  PostgreSQL, with the built website on Cloudflare Pages or Netlify. This costs more but
  you do less server work. The settings in section 2 are the same.
- You need a **domain name** (for example `attendance.yourchurch.org`) pointing at the server.

## 2. Settings for production (`backend/.env`)

```
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://appuser:a-strong-password@localhost:5432/church_attendance
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_urlsafe(48))">
CORS_ORIGINS=["https://attendance.yourchurch.org"]
WEB_BASE_URL=https://attendance.yourchurch.org

SMTP_HOST=...        # see section 6
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=Church Attendance <no-reply@yourchurch.org>
```

- With `ENVIRONMENT=production` the server **refuses to start** if `SECRET_KEY` is short or
  starts with "change", and the `/docs` pages are switched off.
- Use a database user that only owns this database, not the `postgres` superuser.
- Never commit `.env`, and never put it in a zip you share.

## 3. First-time setup on the server

```
cd backend
python -m venv ../venv && ../venv/bin/pip install -r requirements.txt
../venv/bin/python -m scripts.init_db --church-name "Your Church" \
    --admin-name "Jane Doe" --admin-email jane@example.com \
    --admin-phone +237600000000 --admin-password 'a-strong-password'
../venv/bin/alembic upgrade head             # records the schema version
cd ../web && npm install && npm run build    # produces web/dist
```

## 4. Running the API and HTTPS

Run the API with **one worker** behind Caddy. The login rate limits are kept in the memory
of each worker, so more workers would multiply the allowed attempts.

`/etc/systemd/system/church-api.service`:

```
[Unit]
Description=Church Attendance API
After=network.target postgresql.service

[Service]
WorkingDirectory=/srv/church-attendance/backend
ExecStart=/srv/church-attendance/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=always
User=church

[Install]
WantedBy=multi-user.target
```

`--proxy-headers` makes the app see each visitor's real address, which the rate limiter needs.

`/etc/caddy/Caddyfile` (Caddy gets and renews the HTTPS certificate by itself):

```
attendance.yourchurch.org {
    encode gzip
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle {
        root * /srv/church-attendance/web/dist
        try_files {path} /index.html
        file_server
    }
}
```

Then: `sudo systemctl enable --now church-api caddy`. Open only ports 80 and 443 in the
firewall; PostgreSQL (5432) and the API (8000) should not be reachable from outside.

## 4a. Check-in verification (code, QR and location)

Each service can require the code shown on a screen at church, plus a location check
(Admin > Services > Check-in verification).

- **HTTPS is required in production.** Phones only share their location, and browsers only
  allow the phone-id storage, on `https://` pages. On plain `http://` every check-in would be
  flagged "did not share location".
- **Set the church location once:** stand inside the church, open Admin > Check-in and press
  "Use my current location", then Save. Keep the radius at 150-300 m; phones are less
  accurate indoors.
- **On the day:** Admin > Check-in > "Open check-in screen" on a projector or tablet. Use the
  Full screen button. The code changes every 30 seconds and works for up to a minute.
- **The code is derived from `SECRET_KEY`.** If you change that key, codes already shown
  stop working; just refresh the check-in screen.
- **Check-ins that look doubtful** (far from the church, no location, a new phone) still go
  through but appear under Admin > Check-in > Needs review, where you can approve or remove
  them. A wrong or expired code is always refused.
- The server must see each member's real address (the `--proxy-headers` option in section 4)
  for the address saved with each check-in to be meaningful.

## 5. Database changes (migrations)

From now on, a change to a model is applied with Alembic instead of a hand-run script.
Run these from the `backend` folder:

```
alembic revision --autogenerate -m "describe the change"   # creates a file in alembic/versions
# open that file and check it does what you expect, then:
alembic upgrade head
alembic current                                              # shows the version in use
```

Always back up (section 7) before upgrading a live database. Autogenerate only suggests
changes; read each one before you apply it.

## 6. Email (password resets and approval notices)

The app sends mail over SMTP. Pick any provider that gives you SMTP details: Brevo, Mailgun,
Amazon SES, Zoho, or a Gmail/Google Workspace account with an app password. Put the host,
port, user and password in `.env`.

- Port 587 with `SMTP_SECURITY=starttls` is the usual choice. Use 465 with `ssl` if the
  provider says so.
- For mail to reach inboxes instead of spam, send from an address on **your own domain** and
  add the SPF and DKIM records your provider tells you to.
- If email is not set up, the "Forgot password" page still answers, but nothing is sent.
  An admin can set a temporary password from Admin > Members instead.

## 7. Backups

```
cd backend
../venv/bin/python -m scripts.backup_db --keep 30
```

This writes a dated file in `backend/backups/` and removes older ones. It needs `pg_dump`
(package `postgresql-client`). Schedule it every night with cron (`crontab -e`):

```
0 2 * * *  cd /srv/church-attendance/backend && ../venv/bin/python -m scripts.backup_db --keep 30
```

- **Copy the backups off the server** (another machine, or cloud storage with `rclone`). A
  backup that sits on the same disk is lost with it.
- Also back up `backend/media/` (profile photos).
- **Test a restore** now and then on a spare database:
  `pg_restore --clean --if-exists --no-owner -d church_test backups/<file>.dump`

## 7a. Before you go live

- [ ] `ENVIRONMENT=production` and a long random `SECRET_KEY`
- [ ] HTTPS works and `http://` redirects to `https://`
- [ ] The admin account uses a strong password (not the one you used while testing)
- [ ] Sign in with a wrong password 6 times: you should be asked to wait
- [ ] Forgot password: the email arrives and the link works once
- [ ] A nightly backup runs, and you have restored one successfully
- [ ] Only ports 80 and 443 are open
