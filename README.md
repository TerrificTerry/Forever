# Spirit Archive

Spirit Archive is a private, single-user personal intelligence system: diary, self-authored questions, appearance tracking, investment decisions, stock lessons, game reflection, source materials, and AI-assisted memory in one mobile-friendly archive.

There is no registration, social layer, public file directory, or browser-side API key. The diary and private-data areas have separate secondary locks.


## What is included

- Single-user setup and login with bcrypt password hashes and HTTP-only database sessions
- 30-minute secondary unlock sessions for Diary, Data Feed, and My AI
- Searchable CRUD flows for every record module
- Authenticated JPEG, PNG, WebP, TXT, Markdown, JSON, CSV, and PDF uploads
- Server-side PDF/text extraction with useful parse errors
- AI diary summaries, question generation/follow-up, stock evaluation, game-style review, source summaries, and archive Q&A
- Optional stock providers with manual price checks as the permanent fallback
- Markdown/JSON diary export and complete JSON archive export
- PostgreSQL/Prisma, Docker Compose, Caddy HTTPS, and persistent volumes
- Crawler blocking through `robots.txt`, response headers, and metadata

## First run with Docker (recommended)

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Generate two long random secrets and edit `.env`:

   ```bash
   openssl rand -base64 48
   openssl rand -base64 32
   ```

   Put the first value in `AUTH_SECRET` and the second in `SETUP_TOKEN`. Also set a strong `POSTGRES_PASSWORD`. The setup defaults (`ADMIN_INITIAL_PASSWORD` and the two secondary password variables) may remain blank; the setup screen asks for them.

3. Start the database and app:

   ```bash
   docker compose up --build -d
   ```

4. Open `http://localhost:3000/setup`. Enter the `SETUP_TOKEN`, your email, your main password, a diary password, and a private-data password. Each password must have at least eight characters.

After the first account exists, `/setup` permanently redirects to login. Remove setup-default passwords from `.env` if you used them.

## Run directly for development

You need Node.js 20+ and PostgreSQL 16+. In `.env`, use a database URL reachable from the host, usually:

```env
DATABASE_URL="postgresql://spirit_user:your_password@localhost:5432/spirit_archive"
```

Then run:

```bash
npm install
npx prisma db push
npm run dev
```

## AI configuration

All AI requests originate on the server. Add these values to `.env` and restart the app:

```env
OPENAI_API_KEY="your-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4.1-mini"
```

An OpenAI-compatible provider can be used by changing the base URL and model. The Settings page only reports whether the key is configured; it never returns the key to the browser. Without a key, ordinary record keeping and exports continue to work.

## Stock data configuration

Manual mode is the default and needs no key:

```env
STOCK_API_PROVIDER="manual"
```

Supported keyed modes are `alpha_vantage`, `finnhub`, and `twelve_data`. Set the provider and its matching variable:

```env
STOCK_API_PROVIDER="finnhub"
FINNHUB_API_KEY="your-key"
```

If a service fails or a key is absent, records and manual later-price checks still work. The authenticated performance endpoint is `/api/stocks/{record-id}/performance`.

## Secondary-password email recovery

Changing a secondary password requires the current secondary password. For forgotten passwords, Spirit Archive can email a 15-minute, single-use reset link. The user must also be logged in with the main account before the link can be used.

Create a Resend API key, verify a sending domain/address, and add only the real values to `.env`:

```env
RESEND_API_KEY="re_your_key"
EMAIL_FROM="Spirit Archive <archive@your-verified-domain.com>"
SECONDARY_RESET_MINUTES="15"
```

Restart the application after changing these values. The API key must remain blank in `.env.example` and must never be committed.

## Deploy to a VPS with HTTPS

A small Linux VPS in Hong Kong, Singapore, Japan, or US West is a practical choice when access from China and overseas both matter. Provider routing still varies, so test the actual IP before committing long-term.

1. Install Docker Engine and the Compose plugin.
2. On a small VPS, create a 2 GB swap file so a temporary memory spike during image builds or application startup is less likely to trigger the OOM killer. Run these commands once:

   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   swapon --show
   ```

   Swap is an emergency buffer, not a replacement for sufficient RAM. Do not repeat the `tee -a` command after the entry has been added to `/etc/fstab`.

3. Point an A/AAAA DNS record for your domain to the VPS.
4. Clone/copy this project and create a production `.env`.
5. Set:

   ```env
   NODE_ENV="production"
   APP_URL="https://archive.example.com"
   DOMAIN="archive.example.com"
   ```

6. Allow inbound TCP 80/443 and UDP 443 in the VPS firewall.
7. Start the app, database, and Caddy profile:

   ```bash
   docker compose --profile production up --build -d
   ```

Caddy obtains and renews Let's Encrypt certificates automatically. The application port is bound only to localhost; public traffic reaches it through Caddy.

## Backup

Back up the database, uploads, and `.env`. Store the environment file separately and securely.

Database dump:

```bash
docker compose exec -T postgres pg_dump -U spirit_user spirit_archive > spirit-archive-backup.sql
```

Uploaded files:

```bash
tar -czf spirit-archive-uploads.tar.gz uploads/
```

For automated backups, run both commands from a nightly cron job, encrypt the output, copy it off the VPS, and periodically test a restore.

## Restore

Start a clean PostgreSQL service, then restore the dump:

```bash
docker compose up -d postgres
docker compose exec -T postgres psql -U spirit_user -d spirit_archive < spirit-archive-backup.sql
```

Extract the uploads archive into the project so files return to `./uploads`, restore `.env`, and then start the app.

## Security notes

- Use unique main, diary, and private-data passwords.
- Keep `.env` out of version control and restrict it to the deployment user.
- Uploaded files use generated names, size/MIME checks, resolved-path checks, and authenticated delivery.
- The app does not expose `/uploads` as a public static directory.
- Backups contain highly sensitive information; encrypt them before remote storage.
- Keep the host OS, Docker, Node image, and dependencies patched.

## Useful commands

```bash
docker compose logs -f app
docker compose restart app
docker compose down
npm run build
npx prisma studio
```

## 1. 先确认域名和端口

在域名控制台添加：

```text
类型：A
主机记录：archive（可自定义）
记录值：服务器公网 IPv4
```

例如最终域名：

```text
archive.example.com
```

开放：

```text
TCP 22
TCP 80
TCP 443
UDP 443（可选）
```

虽然 443 已开放，仍建议开放 TCP 80。Caddy 官方要求公网域名指向服务器且 80/443 可访问，用于证书签发和 HTTP→HTTPS 跳转。[Caddy 文档](https://caddyserver.com/docs/automatic-https)

如果服务器没有 IPv6，删除域名下错误的 AAAA 记录。

## 2. SSH 登录服务器

在本机 PowerShell 执行：

```powershell
ssh root@服务器公网IP
```

确认系统：

```bash
cat /etc/os-release
free -h
df -h
```

## 3. 创建 2GB swap

先检查：

```bash
swapon --show
```

没有输出再执行：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

这组命令只执行一次。

## 4. 安装 Docker

先检查是否已经安装：

```bash
docker --version
docker compose version
```

如果都有版本号，直接进入下一步。否则执行 Docker 官方安装方式：

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

添加软件源：

```bash
echo "Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc" | sudo tee /etc/apt/sources.list.d/docker.sources
```

安装并验证：

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
```

这是当前的 [Docker 官方 Ubuntu 安装流程](https://docs.docker.com/engine/install/ubuntu/)。

## 5. 下载项目

```bash
cd ~
git clone https://github.com/TerrificTerry/Forever.git
cd Forever
```

确认文件：

```bash
ls -la
```

应该能看到：

```text
Dockerfile
docker-compose.yml
Caddyfile
.env.example
```

## 6. 生成生产密钥

分别执行三次并保存输出：

```bash
openssl rand -hex 48
openssl rand -hex 32
openssl rand -hex 32
```

分别作为：

```text
AUTH_SECRET
SETUP_TOKEN
POSTGRES_PASSWORD
```

## 7. 配置 `.env`

```bash
cp .env.example .env
nano .env
```

至少修改以下内容，把域名和三个随机值换成真实内容，不要保留尖括号：

```env
APP_NAME="Spirit Archive"
APP_URL="https://archive.example.com"
DOMAIN="archive.example.com"
NODE_ENV="production"

POSTGRES_DB="spirit_archive"
POSTGRES_USER="spirit_user"
POSTGRES_PASSWORD="第三个随机值"
DATABASE_URL="postgresql://spirit_user:第三个随机值@postgres:5432/spirit_archive"

AUTH_SECRET="第一个随机值"
SETUP_TOKEN="第二个随机值"

SESSION_DAYS="30"
SECONDARY_UNLOCK_MINUTES="30"
SECONDARY_RESET_MINUTES="15"

ADMIN_EMAIL=""
ADMIN_INITIAL_PASSWORD=""
DIARY_SECONDARY_PASSWORD=""
PRIVATE_DATA_SECONDARY_PASSWORD=""

OPENAI_API_KEY=""
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4.1-mini"

RESEND_API_KEY=""
EMAIL_FROM=""

STOCK_API_PROVIDER="manual"

UPLOAD_STORAGE_PROVIDER="local"
LOCAL_UPLOAD_DIR="./uploads"
MAX_UPLOAD_MB="25"
```

注意：

- `APP_URL` 包含 `https://`
- `DOMAIN` 只写域名，不包含协议
- 两处数据库密码必须完全相同
- 初次部署可以暂时不填 OpenAI 和邮件配置

保存 nano：

```text
Ctrl+O
Enter
Ctrl+X
```

保护环境文件：

```bash
chmod 600 .env
```

## 8. 检查并启动

检查配置语法：

```bash
sudo docker compose config --quiet
```

没有输出就是正常。开始构建：

```bash
sudo docker compose --profile production up --build -d
```

首次构建可能需要几分钟。查看状态：

```bash
sudo docker compose ps
```

查看日志：

```bash
sudo docker compose logs --tail=100 app postgres caddy
```

正常情况下三个服务都应为 `Up`，PostgreSQL 最终显示 `healthy`。

## 9. 验证 HTTPS

```bash
curl -I https://archive.example.com
```

然后在浏览器打开：

```text
https://archive.example.com/setup
```

输入 `.env` 中的 `SETUP_TOKEN`，创建：

- 管理员邮箱
- 主登录密码
- 日记密码
- 私密数据密码

完成后 `/setup` 会关闭，之后从 `/login` 登录。

## 10. 日常维护命令

查看日志：

```bash
sudo docker compose logs -f app
```

重启：

```bash
sudo docker compose restart
```

更新代码：

```bash
git pull
sudo docker compose --profile production up --build -d
```

检查资源：

```bash
free -h
df -h
sudo docker stats
```
