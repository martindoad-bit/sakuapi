#!/usr/bin/env bash
# 把各 skill 里写好的 markdown 草稿同步到对应组的网站目录。
#
# 用法：
#   ./scripts/sync-articles.sh             # 同步所有已配置的组
#   ./scripts/sync-articles.sh restaurant  # 仅同步指定组
#
# 安全保证：每个组的 --delete 严格限定在 src/content/articles/<group>/ 子目录内，
# 不会跨组清理。新增组的稿件如果还没接入此脚本，请直接在 src/content/articles/<group>/
# 下用 git 管理。

set -e

# 组配置：组名:skill_drafts_目录
# 新增组时在此追加一行。skill 的 drafts 目录内部结构必须直接是 YYYY-MM-DD/NN-标题.md
# （不要再嵌套一层组名）。
SKILL_GROUPS=(
  "restaurant:$HOME/.claude/skills/japan-cn-restaurant-media/drafts/restaurant"
  "immigration:$HOME/.claude/skills/japan-immigration-content/drafts/immigration"
)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_BASE="$ROOT/src/content/articles"
ONLY_GROUP="${1:-}"

# 列出所有已配置的组名，给报错用
list_groups() {
  local out=""
  for entry in "${SKILL_GROUPS[@]}"; do
    out="$out${entry%%:*} "
  done
  echo "$out"
}

if [ -n "$ONLY_GROUP" ]; then
  matched=false
  for entry in "${SKILL_GROUPS[@]}"; do
    if [ "${entry%%:*}" = "$ONLY_GROUP" ]; then
      matched=true
      break
    fi
  done
  if [ "$matched" = false ]; then
    echo "❌ 未配置的组: $ONLY_GROUP"
    echo "已配置的组: $(list_groups)"
    echo "如需新增，请编辑 scripts/sync-articles.sh 的 SKILL_GROUPS 数组。"
    exit 1
  fi
fi

synced_any=false
for entry in "${SKILL_GROUPS[@]}"; do
  group="${entry%%:*}"
  source="${entry#*:}"

  if [ -n "$ONLY_GROUP" ] && [ "$group" != "$ONLY_GROUP" ]; then
    continue
  fi

  target="$TARGET_BASE/$group"

  if [ ! -d "$source" ]; then
    echo "⏭️  跳过 $group：源目录不存在 ($source)"
    continue
  fi

  echo "📂 同步 [$group]: $source/ → $target/"
  mkdir -p "$target"
  rsync -av --delete --exclude='.DS_Store' "$source/" "$target/"
  synced_any=true
done

if [ "$synced_any" = false ]; then
  echo "⚠️  没有任何组被同步（所有源目录都不存在或被过滤）"
  exit 0
fi

echo ""
echo "✅ 同步完成"
echo "下一步: git add src/content/articles && git commit -m '同步新文章' && git push"
