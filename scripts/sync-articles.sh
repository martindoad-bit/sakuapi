#!/usr/bin/env bash
# 把 skill 里写好的 markdown 草稿同步到网站 content 目录
# 用法: ./scripts/sync-articles.sh

set -e

SOURCE="$HOME/.claude/skills/japan-cn-restaurant-media/drafts"
TARGET="$(cd "$(dirname "$0")/.." && pwd)/src/content/articles"

if [ ! -d "$SOURCE" ]; then
  echo "❌ 找不到源目录: $SOURCE"
  exit 1
fi

echo "📂 同步 $SOURCE → $TARGET"
mkdir -p "$TARGET"
rsync -av --delete --exclude='.DS_Store' "$SOURCE/" "$TARGET/"
echo "✅ 同步完成"
echo ""
echo "下一步: git add -A && git commit -m '同步新文章' && git push"
