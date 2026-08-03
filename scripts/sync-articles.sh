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
  rsync -av --delete --exclude='.DS_Store' --exclude='_archive/' --exclude='INDEX.md' "$source/" "$target/"

  # ── 防线 1：单向阀——sync 只添加新文章，永不改动已入库文章 ──
  # 文章一旦进了 git，就以 GitHub 为准（网页端编辑是唯一改动通道），
  # skill 侧的旧版本/重复修改不会再覆盖线上内容。
  # 特殊情况要用 skill 版本强制覆盖：SYNC_OVERWRITE=1 ./scripts/sync-articles.sh <组>
  if [ -z "$SYNC_OVERWRITE" ]; then
    while IFS= read -r -d '' dest_file; do
      rel_path="${dest_file#$ROOT/}"
      if ! git -C "$ROOT" ls-files --error-unmatch "$rel_path" >/dev/null 2>&1; then continue; fi
      if ! git -C "$ROOT" diff --quiet -- "$rel_path" 2>/dev/null; then
        if git -C "$ROOT" show "HEAD:$rel_path" > "$dest_file" 2>/dev/null; then
          echo "🔒 已入库文章以 GitHub 为准（跳过 skill 覆盖）: $rel_path"
        fi
      fi
    done < <(find "$target" -name "*.md" -print0)
  else
    echo "⚠️  SYNC_OVERWRITE=1：允许 skill 覆盖已入库文章"
  fi

  # ── 防线 2：未定稿的 WIP 草稿不进 repo + 已删除文章不复活 ──
  # 只处理「git 未跟踪」的文件；已在库的文章不受影响。
  PUBLISHABLE_STATUSES="editing|scheduled|published|archived"
  while IFS= read -r -d '' dest_file; do
    rel_path="${dest_file#$ROOT/}"
    if git -C "$ROOT" ls-files --error-unmatch "$rel_path" >/dev/null 2>&1; then continue; fi
    # 墓碑检查：路径在 git 历史里出现过但现在不在库 = 被人删除过 → 不复活
    if [ -n "$(git -C "$ROOT" log -1 --format=%H -- "$rel_path" 2>/dev/null)" ]; then
      rm "$dest_file"
      echo "🪦 已删除文章不复活（网页端删过）: $rel_path"
      continue
    fi
    st=$(grep -m1 "^status:" "$dest_file" 2>/dev/null | awk '{print $2}' | tr -d '"' || true)
    if ! echo "$st" | grep -qE "^($PUBLISHABLE_STATUSES)$"; then
      rm "$dest_file"
      echo "⏭️  WIP 草稿不入库（status: ${st:-无}）: $rel_path"
    fi
  done < <(find "$target" -name "*.md" -print0)
  find "$target" -type d -empty -delete 2>/dev/null || true
  mkdir -p "$target"

  # ── 防线 3：skill 侧删除 ≠ 站点下线——恢复被 rsync --delete 误删的在库文章 ──
  while IFS= read -r rel; do
    if [ -n "$rel" ] && [ ! -f "$ROOT/$rel" ]; then
      mkdir -p "$(dirname "$ROOT/$rel")"
      if git -C "$ROOT" show "HEAD:$rel" > "$ROOT/$rel" 2>/dev/null; then
        echo "🛟 恢复被 skill 同步删除的在库文章: $rel"
      else
        rm -f "$ROOT/$rel"
      fi
    fi
  done < <(git -C "$ROOT" ls-files "src/content/articles/$group/")
  # ────────────────────────────────────────────────────────────────

  synced_any=true
done

if [ "$synced_any" = false ]; then
  echo "⚠️  没有任何组被同步（所有源目录都不存在或被过滤）"
  exit 0
fi

echo ""
echo "✅ 同步完成"
echo "下一步: ./scripts/deploy.sh（自动 commit + push，GitHub Actions 构建上线）"
