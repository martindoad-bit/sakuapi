#!/usr/bin/env bash
# 一键部署到 Cloudflare Pages
# 用法: ./scripts/deploy.sh

set -e
cd "$(dirname "$0")/.."

# 加载 token
if [ -f .env ]; then
  set -a; source .env; set +a
else
  echo "❌ .env 不存在，需要 CLOUDFLARE_API_TOKEN"
  exit 1
fi

echo "🔄 同步 skill 草稿（仅已配置的组，不影响其他组）..."
./scripts/sync-articles.sh

echo "🏗️  构建..."
npm run build

echo "🚀 部署到 Cloudflare Pages..."
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
  npx wrangler pages deploy dist \
  --project-name="$PAGES_PROJECT" \
  --branch=main \
  --commit-dirty=true

echo ""
echo "✅ 完成"
echo "   👉 https://sakuapi.com"
echo "   👉 https://sakuapi.pages.dev"
