#!/usr/bin/env bash
# 发布本地批次到站点。
#
# 用法:
#   ./scripts/deploy.sh              # 同步所有已配置的组
#   ./scripts/deploy.sh restaurant   # 只同步指定组（推荐：让发哪个组就只动哪个组）
#
# 流程: sync（skill 草稿 → repo）→ 审稿门卫 → commit → push
# 构建和上线由 GitHub Actions 自动完成（.github/workflows/deploy.yml），
# push 后约 1-2 分钟生效。本地不再直接 wrangler 部署——保证 GitHub 是唯一真相源。
#
# 紧急情况需要本地直接部署（比如 GitHub Actions 挂了）:
#   DIRECT_DEPLOY=1 ./scripts/deploy.sh

set -e
cd "$(dirname "$0")/.."

ONLY_GROUP="${1:-}"

echo "🔄 同步 skill 草稿..."
./scripts/sync-articles.sh $ONLY_GROUP

# ── 审稿状态门卫（白名单：只有 editing 及以上才放行）──────────
# 只检查本次要发布的变更（新增/修改），已在库的文章不重复审。
echo "🔍 检查本次变更中的未审稿文章..."
PUBLISHABLE="editing|scheduled|published|archived"
UNREVIEWED=()
while IFS= read -r -d '' file; do
  [ -f "$file" ] || continue
  case "$file" in *.md) ;; *) continue ;; esac
  status=$(grep -m1 "^status:" "$file" 2>/dev/null | awk '{print $2}' | tr -d '"' || true)
  if ! echo "$status" | grep -qE "^($PUBLISHABLE)$"; then
    UNREVIEWED+=("$file")
  fi
done < <(git ls-files -om --exclude-standard -z -- src/content/articles)

if [ ${#UNREVIEWED[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  以下文章状态不在可发布范围（editing/scheduled/published/archived），阻止发布："
  for f in "${UNREVIEWED[@]}"; do
    echo "   - $f"
  done
  echo ""
  echo "❌ 请确认所有文章已审稿（status: editing 或以上）后再发布。"
  echo "   如需强制发布，请运行：SKIP_REVIEW_CHECK=1 ./scripts/deploy.sh"
  if [[ -z "$SKIP_REVIEW_CHECK" ]]; then
    exit 1
  fi
  echo "⚠️  已跳过审稿检查（SKIP_REVIEW_CHECK=1）"
fi
# ────────────────────────────────────────────────────────────────

# ── commit 内容变更（新文件必须进 git，否则不会上线）────────────
if ! git diff --quiet -- src/content/articles public/uploads 2>/dev/null \
   || [ -n "$(git ls-files --others --exclude-standard src/content/articles public/uploads 2>/dev/null)" ]; then
  git add src/content/articles public/uploads 2>/dev/null || git add src/content/articles
  git commit -m "sync: 同步 skill 草稿批次"
  echo "✅ 已 commit 内容变更"
else
  echo "ℹ️  内容无变更，跳过 commit"
fi

# ── push（远端有新 commit 时先合并，不用 rebase）────────────────
echo "📤 推送到 GitHub..."
if ! git push 2>/dev/null; then
  echo "   远端有新提交，先合并再推..."
  git pull --no-rebase --no-edit
  git push
fi

echo ""
echo "✅ 已推送。GitHub Actions 正在自动构建部署（约 1-2 分钟）"
echo "   进度: gh run list --repo martindoad-bit/sakuapi -L 3"
echo "   👉 https://sakuapi.com"

# ── 紧急直接部署通道 ─────────────────────────────────────────────
if [ -n "$DIRECT_DEPLOY" ]; then
  echo ""
  echo "🚨 DIRECT_DEPLOY=1：本地直接构建部署..."
  if [ -f .env ]; then
    set -a; source .env; set +a
  else
    echo "❌ .env 不存在，需要 CLOUDFLARE_API_TOKEN"
    exit 1
  fi
  npm run build
  npx wrangler pages deploy dist --project-name="$PAGES_PROJECT" --branch=main --commit-dirty=true
fi
