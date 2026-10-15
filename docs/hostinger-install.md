# Install the Outreach Kit on a Hostinger VPS (first time, by hand)

Written for the owner doing this once, by hand. One server runs three things: **MySQL** (the data), **the app** (Node, listening only on the server itself) and
**a web server** (Caddy or Nginx) that gives it a real address with HTTPS. Teammates only ever open the address and sign in.

How to read this guide:

- **YOUR CHOICE** marks a step where you decide something. A recommendation is given every time.
- **UNTESTED on a real VPS** marks a command I could not run on a real Ubuntu server. Those were written from the vendors' documentation. The app-side commands
  (`pnpm install`, `build`, `start`, `db:migrate`, `db:init-owner`, `db:import-team`, `db:backup` and a restore) were run on a Mac against MySQL 9.6, and say so where it matters.
  Everything else, treat as a first draft and read each output before you move on.
- `<ANGLE_BRACKETS>` are placeholders. You replace them with your own value. Real secrets never go into this file or into the repo.
- Commands starting `$` are typed by you. Lines under them, without `$`, are what you should see (roughly).
- The password you will be asked for by `sudo` is the one for your own server user (made in step 1), not the database one.

| Placeholder | Meaning | Example |
|---|---|---|
| `<SERVER_IP>` | The VPS's IPv4 address (hPanel → VPS → Overview) | `203.0.113.10` |
| `<DOMAIN>` | The address teammates will open | `outreach.famysys.com` |
| `<ADMIN_EMAIL>` | An email for the HTTPS certificate notices | `you@famysys.com` |
| `<DEPLOY_USER>` | The non-root user that owns and runs the app | `deploy` |
| `<REPO_SSH_URL>` | Your private repo's SSH address | `git@github.com:you/OutreachKit.git` |
| `<DB_NAME>`, `<DB_USER>`, `<DB_PASSWORD>` | The database, its user, its password (you make them in step 2) | `outreachkit`, `okit`, 32 random characters |
| `<SESSION_SECRET>` | 64 random hex characters that sign session cookies (you make it in step 3) | |

---

## 0. What you need before you start

1. **A VPS with Ubuntu 22.04 or 24.04 LTS.** **YOUR CHOICE:** 24.04 is newer; both work. 2 GB RAM or more is comfortable (the build wants about 1.5 GB; step 1 adds swap for smaller boxes).
   If the lead finder will run here, 2 GB is the practical minimum because of Chromium.
2. **A domain or subdomain** you control. **YOUR CHOICE:** use a subdomain such as `outreach.famysys.com`, so your main site is not involved.
   Create an **A record** for it pointing at `<SERVER_IP>` at your DNS provider (if the DNS is at Hostinger: hPanel → Domains → DNS / Nameservers). Then wait, and check from your Mac:
   ```
   $ dig +short <DOMAIN>
   <SERVER_IP>
   ```
   If this prints nothing or a different address, stop and wait: HTTPS in step 6 cannot be issued until it prints your server's address. (An IPv6 `AAAA` record is optional; add one only if the VPS has an IPv6 address you have checked.)
3. **SSH access** to the VPS as `root` (Hostinger shows the root password or lets you add an SSH key in hPanel; its "Browser terminal" works too). Check from your Mac:
   ```
   $ ssh root@<SERVER_IP>
   ```
   The first time it asks "Are you sure you want to continue connecting?": type `yes`.
4. **Your private repo's address** and the ability to add a **deploy key** to it (GitHub → repo → Settings → Deploy keys), or the ability to copy the code up another way (step 3).
5. **An SSH key on your Mac.** If `ls ~/.ssh/id_ed25519.pub` finds nothing, make one: `ssh-keygen -t ed25519 -C "you@famysys.com"` (press Enter at the questions, or set a passphrase).

> Everything below happens on the server unless it says "on your Mac".

---

## 1. Harden the VPS  (UNTESTED on a real VPS)

Do this first. Keep your root session open until step 1.4 says it is safe to close.

**1.1 Update the system and set the clock to UTC**

```
$ apt update && apt upgrade -y
$ timedatectl set-timezone UTC
$ timedatectl | grep "Time zone"
                Time zone: Etc/UTC (UTC, +0000)
```

If it says a new kernel is installed or `*** System restart required ***`, run `reboot`, wait a minute, and log in again.

**1.2 Make a non-root user** (this guide calls it `deploy`; **YOUR CHOICE** of name)

```
$ adduser deploy
$ usermod -aG sudo deploy
```

`adduser` asks for a password (this is the `sudo` password; make it long and save it in your password manager) and some optional details (press Enter).

**1.3 Put your SSH key on that user.** On your **Mac**, in a new terminal tab:

```
$ ssh-copy-id deploy@<SERVER_IP>
$ ssh deploy@<SERVER_IP>
deploy@vps:~$
```

You must be able to log in as `deploy` **with your key** (it should not ask for the server password; it may ask for your key's passphrase). If it does not work, stop and fix it before 1.4.

**1.4 Turn off root login and password login** (as `deploy`, in the new tab)

```
$ sudo tee /etc/ssh/sshd_config.d/00-hardening.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
$ sudo sshd -t && sudo systemctl reload ssh
```

`sshd -t` prints nothing when the file is fine. (The file is named `00-` so it is read before any `50-cloud-init.conf` that may re-enable passwords: the first setting wins.) Now open a **third** tab and run `ssh deploy@<SERVER_IP>` again. Only when that works, close the old root session.
(If you lock yourself out, hPanel's Browser terminal / VPS console is the way back in.)

**1.5 Firewall: allow only SSH, HTTP and HTTPS**

```
$ sudo ufw allow OpenSSH
$ sudo ufw allow 80/tcp
$ sudo ufw allow 443/tcp
$ sudo ufw enable
Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
$ sudo ufw status
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
(and the same three for "(v6)")
```

Hostinger may also have its own firewall in hPanel (VPS → Security → Firewall). If you use it, allow the same three ports there. The app (5021) and MySQL (3306) are deliberately **not** open.

**1.6 Automatic security updates and a small safety net**

```
$ sudo apt install -y unattended-upgrades fail2ban ufw
$ sudo dpkg-reconfigure -plow unattended-upgrades      # answer Yes
```

`fail2ban` bans addresses that keep guessing SSH passwords, and works with no setup. **YOUR CHOICE:** skip it if you prefer fewer moving parts; key-only SSH already stops password guessing.

**1.7 Swap (only if the server has 2 GB of RAM or less)**

```
$ free -h | grep -E "Mem|Swap"
$ sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
$ echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
$ free -h | grep Swap
Swap:          2.0Gi          0B       2.0Gi
```

---

## 2. Install Node 22, pnpm, git and MySQL, and make the database  (UNTESTED on a real VPS)

**2.1 Git, build tools, and Node 22**

```
$ sudo apt install -y git curl ca-certificates build-essential
$ curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
$ sudo apt install -y nodejs
$ node --version
v22.x.x
```

It must print `v22` or higher. (The app needs Node 22 or newer.) **YOUR CHOICE:** nvm or fnm also work; this guide assumes Node is at `/usr/bin/node`, which is what the service file below uses. If you pick another way, adjust that path.

**2.2 pnpm** (the repo pins the version)

```
$ sudo npm install -g pnpm@11.20.0
$ pnpm --version
11.20.0
```

**2.3 MySQL**

```
$ sudo apt install -y mysql-server
$ sudo systemctl enable --now mysql
$ mysql --version
mysql  Ver 8.0.xx for Linux on x86_64 (...)
```

Any 8.0 or newer is fine. Ubuntu's MySQL listens only on `127.0.0.1` by default; confirm it:

```
$ sudo ss -ltnp | grep -E ':3306|:33060'
LISTEN 0  151  127.0.0.1:3306   ...
LISTEN 0  70   127.0.0.1:33060  ...
```

It must say `127.0.0.1` (not `0.0.0.0` or `*`). If it does not, do not go on: set `bind-address = 127.0.0.1` in `/etc/mysql/mysql.conf.d/mysqld.cnf` and `sudo systemctl restart mysql`.

**2.4 Secure MySQL.** Ubuntu's `root` database account logs in through the operating system (`sudo mysql`), with no password to steal, which is fine. Run the standard clean-up:

```
$ sudo mysql_secure_installation
```

Answers: **VALIDATE PASSWORD component** → `n` (your database password is a random one, step 2.5). **Change the root password?** → `n` (keep socket login; on Ubuntu it may skip this question). **Remove anonymous users** → `y`. **Disallow root login remotely** → `y`. **Remove test database** → `y`. **Reload privilege tables** → `y`.

**2.5 Make the database and a least-privilege user that can connect from localhost only**

First make a random password and keep it for a minute (you will paste it in two places):

```
$ openssl rand -hex 16
a3f1...(32 characters)
```

That is your `<DB_PASSWORD>`. **YOUR CHOICE:** the names `outreachkit` and `okit` below are suggestions.

```
$ sudo mysql
mysql> CREATE DATABASE outreachkit CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
mysql> CREATE USER 'okit'@'localhost' IDENTIFIED BY '<DB_PASSWORD>';
mysql> GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, LOCK TABLES ON outreachkit.* TO 'okit'@'localhost';
mysql> FLUSH PRIVILEGES;
mysql> exit
```

What this user can and cannot do: it works only inside the `outreachkit` database, and only from the server itself (`'okit'@'localhost'`). It can read and write rows and run the app's migrations (which add tables and indexes); it cannot drop the database, make users, or touch any other database.
`LOCK TABLES` is for the nightly backup (step 8). Check it:

```
$ mysql -uokit -p outreachkit -e "SELECT 1"
Enter password:
+---+
| 1 |
+---+
| 1 |
+---+
```

(The collation `utf8mb4_bin` matters: the app compares text exactly. Keep it as written.)

---

## 3. Get the code onto the server and set the environment variables

**3.1 Get the code.** **YOUR CHOICE:**

- **A (recommended): a read-only deploy key.** Only this server can pull the repo, and it cannot push.
  ```
  $ ssh-keygen -t ed25519 -f ~/.ssh/okit_deploy -N "" -C "okit-vps-deploy"
  $ cat ~/.ssh/okit_deploy.pub
  ```
  Copy that line. In GitHub: your repo → Settings → Deploy keys → Add deploy key → paste it, **leave "Allow write access" unticked**. Then:
  ```
  $ printf 'Host github.com\n  IdentityFile ~/.ssh/okit_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config && chmod 600 ~/.ssh/config
  $ git clone <REPO_SSH_URL> ~/outreachkit
  Cloning into '/home/deploy/outreachkit'...
  ```
  The first connection asks to trust GitHub's host key: check it against GitHub's published fingerprints, then type `yes`.
- **B: copy it up from your Mac** (no GitHub access from the server at all). On your **Mac**, in the project folder: `rsync -az --exclude node_modules --exclude .next --exclude .git --exclude .env.local ./ deploy@<SERVER_IP>:~/outreachkit/`.
  Updating later (step 9) then means running that same line again instead of `git pull`.

Either way, finish with:

```
$ cd ~/outreachkit && ls
CLAUDE.md  README.md  db  docs  package.json  pnpm-lock.yaml  scripts  src  team  ...
```

**3.2 Make the secrets and write the environment file.** The app reads `~/outreachkit/.env.local` (the same file the `pnpm db:...` commands use). It is never committed.

```
$ node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
c9e0...(64 characters)
```

That is `<SESSION_SECRET>`. Now write the file (replace the three `<...>` values; use your editor if you prefer, e.g. `nano .env.local`):

```
$ cd ~/outreachkit
$ cat > .env.local <<'EOF'
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=outreachkit
DB_USER=okit
DB_PASSWORD=<DB_PASSWORD>
SESSION_SECRET=<SESSION_SECRET>
EOF
$ chmod 600 .env.local
$ ls -l .env.local
-rw------- 1 deploy deploy 190 ... .env.local
```

Keep `<DB_PASSWORD>` and `<SESSION_SECRET>` in your password manager too. If `SESSION_SECRET` is ever lost or changed, everyone is simply signed out; nothing else is lost. Do **not** set `OKIT_ALLOW_CLOCK_OVERRIDE` or `OKIT_CLOCK_OFFSET_MS` here: they exist only for the test suite.

---

## 4. Install, build, create the tables, and put your data in

**4.1 Install and build** (the build takes a few minutes and a lot of memory; this is why step 1.7 added swap)

```
$ cd ~/outreachkit
$ pnpm install --frozen-lockfile
Done in 20s using pnpm v11.20.0
$ NODE_ENV=production pnpm build
✓ Compiled successfully
...
ƒ  (Dynamic)  server-rendered on demand
```

If the build is "Killed", the server ran out of memory: check swap (step 1.7), or build on your Mac and copy the `.next` folder up (`rsync -az .next/ deploy@<SERVER_IP>:~/outreachkit/.next/`; the Mac and the server must run the same Node major version).

**4.2 Create the tables.** *(Run on a Mac against MySQL 9.6; the database name in the first line will be yours.)*

```
$ pnpm db:migrate
Applied 1 migration to outreachkit:
  0001_init.sql
$ pnpm db:migrate
outreachkit is up to date.
```

Running it twice is safe: it applies only what has not run yet, and it refuses to run if an already-applied file was edited.

**4.3 Choose how the data starts. YOUR CHOICE (pick exactly one; do not do both):**

- **4A. Bring over everything from the old `team/` files** (recommended if you have data: your accounts, leads, kits, events, audit log, finder results). Accounts and **passwords come across unchanged** (only the bcrypt hashes move), so people use the password they already have.
  The repo copy of `team/` is the source, and it is only read, never changed.
  ```
  $ pnpm db:import-team            # a DRY RUN: nothing is written
  DRY RUN: /home/deploy/outreachkit/team -> database outreachkit on 127.0.0.1:3306

                        in files  usable  inserted  present  refused  check
  workspace                    1       1         1        0        0  ok
  teams                        1       1         1        0        0  ok
  users                        3       3         3        0        0  ok
  ...
  Counts reconcile. Dry run: nothing was written. Run again with --apply to write.
  ```
  Read the table. **inserted** is what it would add; **in files** and **usable** should be equal; every row must say `ok`. Anything under "Need a look" is a record it could not import, with its path and why; "Duplicate businesses" lists leads that share a phone or name; they are imported but left unguarded on the shared key, so you can merge them in the app.
  When the dry run looks right (a dry run on a copy of your real `team/` on 13 Oct 2026 showed 3 users, 18 leads, 19 events, 9 audit lines, 3 finder runs and 25 finder rows, every row `ok`):
  ```
  $ pnpm db:import-team --apply
  ...
  Counts reconcile. Committed.
  ```
  You can run it again later: it adds only what is new and never overwrites anything already in the database. **Do not run `pnpm db:init-owner` in this path**: your owner account arrives with the import.
  Make sure nobody adds data through the old Sync-based app between your dry run and `--apply`.
- **4B. Start empty.** Make the first owner account:
  ```
  $ pnpm db:init-owner
  Set up the Famysys Outreach Kit workspace. This runs once, on the server.

  Workspace name (for example Famysys): Famysys
  Studio or brand used in every kit: Famysys
  Demo domain (for example famysys.com): famysys.com
  Your username (3 to 30 characters: letters, digits, dot, underscore): owner
  Your full name: Your Name
  Choose your password (10 or more characters): ********
  Type it again: ********

  Done. Created the workspace and your account (owner).
  ```
  It runs once: a second run says "The database already has a super admin" and changes nothing. The password you type is never printed or saved anywhere except as a bcrypt hash.
  (For a scripted run, set the password in the `OKIT_OWNER_PASSWORD` environment variable for that one command and pass `--workspace`, `--studio`, `--domain`, `--username`, `--name`.)

**4.4 Try it** before wiring the service (stop it with Ctrl+C when done):

```
$ NODE_ENV=production pnpm start
▲ Next.js 15.5.27
- Local:        http://127.0.0.1:5021
✓ Ready in 500ms
```

In a second terminal on the server: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5021/login` should print `200`. If it prints `500`, read the first terminal: the cause is almost always a wrong value in `.env.local` (step 10 lists the messages). Do **not** try to sign in through `http://<SERVER_IP>:5021`; the port is closed to the world on purpose, and the session cookie is `Secure`, so it only works over HTTPS (step 6).

---

## 5. Keep it running: restart on crash and on reboot  (UNTESTED on a real VPS)

**YOUR CHOICE:** **systemd (recommended)** is already on the server and needs nothing extra. pm2 is a fine alternative if you know it.

**5A. systemd**

```
$ sudo tee /etc/systemd/system/outreachkit.service >/dev/null <<'EOF'
[Unit]
Description=Famysys Outreach Kit
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/outreachkit
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /home/deploy/outreachkit/node_modules/next/dist/bin/next start -H 127.0.0.1 -p 5021
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now outreachkit
$ systemctl status outreachkit --no-pager
● outreachkit.service - Famysys Outreach Kit
     Active: active (running) since ...
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5021/login
200
```

(The service reads `.env.local` from its `WorkingDirectory`, so the secrets are not in the unit file.) Logs: `journalctl -u outreachkit -n 100 --no-pager`; follow them with `-f`.
Prove it restarts: `sudo kill -9 $(systemctl show -p MainPID --value outreachkit)` then, three seconds later, `systemctl status outreachkit` shows it running again. Prove it survives a reboot with `sudo reboot`, wait, log in, and run the `curl` line again.

**5B. pm2 (alternative)**

```
$ sudo npm install -g pm2
$ cd ~/outreachkit
$ NODE_ENV=production pm2 start "node_modules/next/dist/bin/next start -H 127.0.0.1 -p 5021" --name outreachkit
$ pm2 save
$ pm2 startup systemd          # run the one line it prints, with sudo
```

---

## 6. The web server with free HTTPS  (UNTESTED on a real VPS)

**YOUR CHOICE:** **Caddy (recommended)** gets and renews the Let's Encrypt certificate by itself and needs a three-line config. Nginx plus Certbot is the alternative.
Both need the DNS from step 0 to be right, or the certificate cannot be issued.

**6A. Caddy**

```
$ sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
$ curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
$ curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
$ sudo apt update && sudo apt install -y caddy
$ sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
{
	email <ADMIN_EMAIL>
}

<DOMAIN> {
	encode zstd gzip
	reverse_proxy 127.0.0.1:5021 {
		flush_interval -1
	}
}
EOF
$ sudo systemctl reload caddy
$ journalctl -u caddy -n 20 --no-pager
... certificate obtained successfully ...
```

`flush_interval -1` keeps the lead finder's live progress (a stream) from being held back. Caddy sends the original `Host` and `X-Forwarded-*` headers by default, which the app's same-origin checks rely on.

**6B. Nginx and Certbot (alternative)**

```
$ sudo apt install -y nginx certbot python3-certbot-nginx
$ sudo tee /etc/nginx/sites-available/outreachkit >/dev/null <<'EOF'
server {
    listen 80;
    server_name <DOMAIN>;

    location / {
        proxy_pass http://127.0.0.1:5021;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
EOF
$ sudo ln -s /etc/nginx/sites-available/outreachkit /etc/nginx/sites-enabled/outreachkit
$ sudo rm -f /etc/nginx/sites-enabled/default
$ sudo nginx -t && sudo systemctl reload nginx
$ sudo certbot --nginx -d <DOMAIN> --redirect -m <ADMIN_EMAIL> --agree-tos
```

`proxy_buffering off` and the long `proxy_read_timeout` are for the lead finder, whose run can last many minutes. Certbot renews on its own (`sudo systemctl list-timers | grep certbot`).

**6.1 Confirm HTTPS works and the cookie is Secure**

From your **Mac**:

```
$ curl -sI https://<DOMAIN>/login | head -3
HTTP/2 200
...
$ curl -sI http://<DOMAIN>/login | head -2
HTTP/1.1 308 Permanent Redirect        (or 301; it must redirect to https://)
```

Then in a browser: open `https://<DOMAIN>`, you land on the sign-in page with a padlock. Sign in. Open the browser's developer tools → Application (Chrome) / Storage (Firefox) → Cookies → `okit_session`: **Secure** and **HttpOnly** must both be ticked, and SameSite should be `Lax`.
(The same three properties are checked automatically by `pnpm e2e` on the Mac.) If sign-in just reloads the sign-in page, you are on plain `http://`: use the `https://` address.

---

## 7. Optional: the lead finder  (UNTESTED on a real VPS)

The lead finder drives a real Chromium browser on the server to read Google Maps. **YOUR CHOICE:** skip this whole step if you do not want it; the app works without it, and the owner can switch the feature off for the workspace (Platform → Feature switches).

**Say this plainly first:** Google does not like automated use of Maps, and **a datacentre IP address, which is what a VPS has, is much more likely to be shown a CAPTCHA or "unusual traffic" page or to be blocked outright** than a home or office connection. The finder stops at once when that happens and saves what it found so far, and it never retries or tries to get around it. It may simply not work from this server. If it does not, the same app can run the finder from your own computer (see the README) while everything else stays on the server.

```
$ cd ~/outreachkit
$ sudo env "PATH=$PATH" pnpm exec playwright install-deps chromium     # system libraries (needs root)
$ pnpm exec playwright install chromium                                # the browser, into /home/deploy/.cache (as deploy, not root)
```

(The `install --with-deps` shortcut does both, but run with `sudo` it puts the browser in root's folder where the service cannot find it. These two lines avoid that.)

Test it with the **smallest limit**:

1. Sign in as the owner or a researcher/BD, open **Lead finder** (or the Kit Console, build a kit, and use the finder section).
2. Pick a category and a city, set **Today's limit** to **20**, and press **Find businesses**.
3. You should see progress like `Checked 23 · saved 7 · with website 5 · without website 2`, and rows appear in the two tabs (each one is also added to your leads).
4. If you see "captcha", "consent" or "blocked", that is Google refusing this IP. That is the datacentre-IP problem above, not a bug.

Or from the terminal: `pnpm scrape "Roofing" "Dallas" TX --as <USERNAME> --limit 20`.

---

## 8. Backups: a nightly dump with retention, and one test restore

A backup on the same disk does not protect you if the server is lost. This does the nightly copy; **YOUR CHOICE** how you also get a copy off the server (Hostinger's VPS snapshots/backups in hPanel, and/or `rsync`/`scp` of the backup folder to your Mac or cloud storage weekly). Do at least one of those.

**8.1 The nightly dump.** `pnpm db:backup` writes a compressed dump and deletes our own backups older than 14 days. *(Run on a Mac with the output below.)*

```
$ cd ~/outreachkit && pnpm db:backup
Backup written: /home/deploy/backups/outreachkit/outreachkit-20261013-031500.sql.gz (3354 bytes)
$ ls -l ~/backups/outreachkit
-rw------- 1 deploy deploy ... outreachkit-20261013-031500.sql.gz
```

The folder is private (mode 700), the password goes to `mysqldump` through a temporary private file and is never printed, and a failed dump leaves no half-written file. Options: `--dir <folder>` and `--keep <days>`.

Schedule it for 03:15 every night as `deploy`:

```
$ crontab -e
15 3 * * * cd /home/deploy/outreachkit && PATH=/usr/local/bin:/usr/bin:/bin pnpm db:backup >> /home/deploy/backups/backup.log 2>&1
```

Next morning, `tail ~/backups/backup.log` should show a "Backup written" line. UNTESTED under cron on a real VPS, and with the limited grant list from step 2.5 (the script itself was run by hand, as a user with full rights on its database). If the log says `Access denied ... need the PROCESS / RELOAD privilege`, tell me the exact message and the fix is a one-line extra `GRANT`.
`mysqldump` comes with `mysql-server`'s client tools on Ubuntu; check `which mysqldump`.

**8.2 One test restore** (do it once now, so you know it works before you need it). It restores into a **separate scratch database**, so your live data is untouched:

```
$ LATEST=$(ls -t ~/backups/outreachkit/outreachkit-*.sql.gz | head -1)
$ sudo mysql -e "CREATE DATABASE okit_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"
$ gunzip -c "$LATEST" | sudo mysql okit_restore_test
$ sudo mysql -e "SELECT (SELECT COUNT(*) FROM okit_restore_test.users) AS users, (SELECT COUNT(*) FROM okit_restore_test.leads) AS leads"
+-------+-------+
| users | leads |
+-------+-------+
|     3 |    18 |
+-------+-------+
$ sudo mysql -e "SELECT (SELECT COUNT(*) FROM outreachkit.users) AS users, (SELECT COUNT(*) FROM outreachkit.leads) AS leads"
(the same numbers)
$ sudo mysql -e "DROP DATABASE okit_restore_test"
```

The two number rows must match. *(The dump and restore commands were tested on a Mac with MySQL 9.6; `sudo mysql` socket login is the Ubuntu way, UNTESTED here.)*

---

## 9. Updating later, and rolling back  (UNTESTED on a real VPS)

**Update:**

```
$ cd ~/outreachkit
$ pnpm db:backup                              # always first
$ git fetch && git log --oneline HEAD..origin/main        # what is about to arrive (path B: rsync from your Mac instead)
$ git pull --ff-only
$ pnpm install --frozen-lockfile
$ NODE_ENV=production pnpm build
$ pnpm db:migrate                             # applies any new database changes; "up to date" if none
$ sudo systemctl restart outreachkit
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5021/login
200
```

Build **before** the restart: the old version keeps serving until the new build is ready, so the downtime is a few seconds. People are not signed out by an update (the session secret is unchanged).

**Roll back code only** (the new version misbehaves but did not change the database):

```
$ git log --oneline -5                        # find the last good commit
$ git checkout <GOOD_COMMIT>
$ pnpm install --frozen-lockfile && NODE_ENV=production pnpm build && sudo systemctl restart outreachkit
```

(To get back to the latest later: `git checkout main && git pull --ff-only`.)

**Roll back the database too** (a migration changed tables and you need the old shape). Migrations only go forward, so this restores last night's (or the pre-update) backup. **You lose anything written since that backup.**

```
$ sudo systemctl stop outreachkit
$ sudo mysql -e "DROP DATABASE outreachkit; CREATE DATABASE outreachkit CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;"
$ gunzip -c ~/backups/outreachkit/<BACKUP_FILE>.sql.gz | sudo mysql outreachkit
$ git checkout <GOOD_COMMIT>
$ pnpm install --frozen-lockfile && NODE_ENV=production pnpm build
$ sudo systemctl start outreachkit
```

The `okit` user keeps its permissions because they are granted on the database name. Then the restored `schema_migrations` table matches the old code, so the next update re-applies the newer migration.

---

## 10. Troubleshooting

**The app won't start** (`systemctl status outreachkit` says `failed`, or `pnpm start` exits). Read `journalctl -u outreachkit -n 50 --no-pager`. Common causes:

| What it says | What it means | Fix |
|---|---|---|
| `SESSION_SECRET is not set` / `must be at least 32 characters` | The secret is missing or short | Fix `.env.local` (step 3.2), `sudo systemctl restart outreachkit` |
| `The database isn't set up. Missing environment variable...` | A `DB_...` line is missing in `.env.local` | Add it. It names the missing ones and never prints values |
| `EADDRINUSE ... 5021` | Something else (an old copy) is on that port | `sudo ss -ltnp \| grep 5021`; stop the other one (`sudo systemctl stop outreachkit` before running `pnpm start` by hand) |
| `Could not find a production build` | `pnpm build` was not run, or failed | Run it (step 4.1) |
| `Cannot find module` | Dependencies not installed after an update | `pnpm install --frozen-lockfile`, rebuild |

**I can't sign in.**

- The sign-in page just reloads, or you land back on it: you are on `http://`. The cookie is `Secure` and is dropped over plain HTTP. Use `https://<DOMAIN>`.
- "That username and password don't match, or the account is not active": the username is lower case; the account may be paused or turned off (Users page); or you are typing the temporary password after you already chose your own (use your own).
- "Too many tries. Wait 15 minutes": five wrong passwords lock a **name** for 15 minutes. It lifts by itself. To lift it now: `sudo mysql outreachkit -e "DELETE FROM signin_failures"`.
- Everyone is signed out after an update: `SESSION_SECRET` changed. Put the old one back, or accept that everyone signs in once.
- A teammate you imported (step 4A) gets "don't match": try the password they used before the move; the hash was copied unchanged. If unsure, reset it in Users.

**502 Bad Gateway (or Caddy's 502) from the web server.**

1. Is the app up? `systemctl status outreachkit` and `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5021/login` (must be `200`).
2. If not, start it and read its log (above).
3. If the app answers but the proxy still 502s, check the proxy points at `127.0.0.1:5021` (Caddyfile or the nginx `proxy_pass`), then `sudo systemctl reload caddy` / `sudo nginx -t && sudo systemctl reload nginx`.
4. A certificate error rather than a 502: `dig +short <DOMAIN>` must show the server's IP, and ports 80/443 must be open in `ufw` and in Hostinger's firewall. `journalctl -u caddy -n 50` says why issuing failed.

**Database connection refused / access denied** (the page shows "Something went wrong"; the log shows `ECONNREFUSED` or `ER_ACCESS_DENIED_ERROR`).

- `ECONNREFUSED 127.0.0.1:3306`: MySQL is not running. `sudo systemctl status mysql`, `sudo systemctl start mysql`.
- `Access denied for user 'okit'@'localhost'`: the password in `.env.local` differs from the one in MySQL. Test by hand: `mysql -uokit -p outreachkit -e "SELECT 1"`. Reset it with `sudo mysql -e "ALTER USER 'okit'@'localhost' IDENTIFIED BY '<NEW>';"`, update `.env.local`, restart the service.
- `Unknown database`: `DB_NAME` is wrong, or step 2.5 was skipped.
- `CREATE command denied` during `pnpm db:migrate`: the grant in step 2.5 is missing `CREATE, ALTER, INDEX, REFERENCES`. Re-run that `GRANT`.
- `Too many connections`: unusual here; restart the service, then check nothing else is hammering MySQL.

**The lead finder is blocked or won't run.**

- Progress ends with captcha / consent / blocked: Google is refusing the server's address (step 7). It stops on purpose and keeps what it saved. Wait and try later with the 20 limit, or run the finder from your own computer.
- "Chromium isn't installed for Playwright": run the two lines in step 7 **as `deploy`**, then restart the service. If the browser exists but fails to start with **"No usable sandbox"** or a user-namespace error (Ubuntu 24.04 restricts this), see Playwright's Linux notes; the common server fix is `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` (make it permanent in `/etc/sysctl.d/`), after weighing that it loosens a system hardening setting. UNTESTED on a real VPS.
- "A run is already in progress": only one finder run happens at a time on the server; wait for it to finish.
- The run dies after some minutes behind the proxy: check `flush_interval -1` (Caddy) or `proxy_buffering off` and the long `proxy_read_timeout` (Nginx) from step 6.

**Something else.** `journalctl -u outreachkit -n 200 --no-pager` first; then `sudo systemctl status mysql caddy outreachkit`; then check disk space (`df -h`) and memory (`free -h`).
