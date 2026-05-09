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

# ── 审稿状态检查 ───────────────────────────────────────────────
echo "🔍 检查未审稿文章..."
UNREVIEWED=()
while IFS= read -r -d '' file; do
  status=$(grep -m1 "^status:" "$file" 2>/dev/null | awk '{print $2}' | tr -d '"' || true)
  if [[ "$status" == "drafting" || "$status" == "review" || -z "$status" ]]; then
    UNREVIEWED+=("$file")
  fi
done < <(find src/content/articles -name "*.md" -print0)

if [ ${#UNREVIEWED[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  以下文章尚未通过审稿（status: drafting / review / 无状态），将跳过部署："
  for f in "${UNREVIEWED[@]}"; do
    echo "   - $f"
  done
  echo ""
  echo "❌ 请确认所有文章已审稿（status: editing 或以上）后再部署。"
  echo "   如需强制部署，请运行：SKIP_REVIEW_CHECK=1 ./scripts/deploy.sh"
  if [[ -z "$SKIP_REVIEW_CHECK" ]]; then
    exit 1
  fi
  echo "⚠️  已跳过审稿检查（SKIP_REVIEW_CHECK=1）"
fi
# ────────────────────────────────────────────────────────────────

echo "🏗️  构建..."
npm run build

echo "📤 推送到 GitHub（/api/list 数据源）..."
git push

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
