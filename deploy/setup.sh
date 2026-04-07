#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Stox server — EC2 setup script
# Run once on a fresh Amazon Linux 2023 or Ubuntu 22.04 instance.
# Usage: bash setup.sh
# -----------------------------------------------------------------------------
set -euo pipefail

echo "==> Detecting OS..."
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo "Cannot detect OS. Exiting."
  exit 1
fi

# -----------------------------------------------------------------------------
# 1. System packages
# -----------------------------------------------------------------------------
echo "==> Installing system packages..."

if [[ "$OS" == "amzn" ]]; then
  sudo dnf update -y
  sudo dnf install -y git curl tar gzip

  # Chrome / Puppeteer dependencies on Amazon Linux 2023
  sudo dnf install -y \
    alsa-lib atk at-spi2-atk at-spi2-core cairo cups-libs dbus-libs \
    expat fontconfig freetype gdk-pixbuf2 glib2 gtk3 libdrm libgbm \
    libX11 libXcomposite libXdamage libXext libXfixes libXrandr \
    libxcb libxkbcommon mesa-libgbm nspr nss pango xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 xorg-x11-utils

elif [[ "$OS" == "ubuntu" ]]; then
  sudo apt-get update -y
  sudo apt-get install -y git curl tar gzip

  # libasound2 was renamed to libasound2t64 in Ubuntu 24.04
  UBUNTU_VERSION=$(lsb_release -rs 2>/dev/null || echo "0")
  if awk "BEGIN {exit !($UBUNTU_VERSION >= 24.04)}"; then
    ALSA_PKG="libasound2t64"
  else
    ALSA_PKG="libasound2"
  fi

  # Chrome / Puppeteer dependencies on Ubuntu
  sudo apt-get install -y \
    ca-certificates fonts-liberation "$ALSA_PKG" libatk-bridge2.0-0 \
    libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
    libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 \
    libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 lsb-release wget xdg-utils

else
  echo "Unsupported OS: $OS. Install Chrome deps manually."
fi

# -----------------------------------------------------------------------------
# 2. Node.js 22 via nvm
# -----------------------------------------------------------------------------
echo "==> Installing Node.js 22 via nvm..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Load nvm in this shell session
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 22
nvm use 22
nvm alias default 22

# Persist nvm in shell profile
if ! grep -q 'NVM_DIR' ~/.bashrc; then
  cat >> ~/.bashrc << 'EOF'

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
EOF
fi

# Also add to .profile so it's available in non-interactive login shells
if ! grep -q 'NVM_DIR' ~/.profile 2>/dev/null; then
  cat >> ~/.profile << 'EOF'

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
EOF
fi

echo "Node: $(node -v)  npm: $(npm -v)"

# -----------------------------------------------------------------------------
# 3. PM2
# -----------------------------------------------------------------------------
echo "==> Installing PM2..."
npm install -g pm2
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash || true

# -----------------------------------------------------------------------------
# 4. Clone / update repo
# -----------------------------------------------------------------------------
REPO_DIR="$HOME/stox"
REPO_URL="${REPO_URL:-}"  # set via: REPO_URL=https://github.com/you/stox.git bash setup.sh

if [ -z "$REPO_URL" ]; then
  echo ""
  echo "REPO_URL not set. Skipping clone."
  echo "Set it and re-run, or manually clone to $REPO_DIR:"
  echo "  REPO_URL=https://github.com/you/stox.git bash setup.sh"
  echo ""
else
  if [ -d "$REPO_DIR/.git" ]; then
    echo "==> Pulling latest changes..."
    git -C "$REPO_DIR" pull
  else
    echo "==> Cloning repo..."
    git clone "$REPO_URL" "$REPO_DIR"
  fi

  cd "$REPO_DIR"
  echo "==> Installing npm dependencies (including devDependencies for build)..."
  npm ci

  echo "==> Building server..."
  npx tsc -p tsconfig.server.json

  echo "==> Pruning devDependencies..."
  npm prune --omit=dev

  echo "==> Starting server with PM2..."
  pm2 start deploy/ecosystem.config.cjs --env production
  pm2 save

  echo ""
  echo "Done. Server running on port 3001."
  echo ""
  echo "  IMPORTANT: Run this to load nvm/pm2 into your current shell:"
  echo "    source ~/.bashrc"
  echo ""
  echo "  Then:"
  echo "    pm2 logs stox-server   — tail logs"
  echo "    pm2 status             — check status"
fi
