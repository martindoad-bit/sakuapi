# Sakuapi

在日华人餐饮内容站 · 内部团队共享。

## 本地开发

```sh
npm install
npm run dev
# → http://localhost:4321
```

## 写新文章

两种工作流，按组选用：

### 方式 A：从 skill drafts 同步（适合 restaurant 组等已配置的组）

写在对应 skill 的 `drafts/<group>/YYYY-MM-DD/NN-标题.md` 下，然后：

```sh
./scripts/sync-articles.sh                # 同步所有已配置的组
./scripts/sync-articles.sh restaurant     # 仅同步指定组
git add src/content/articles
git commit -m "同步新文章"
git push
```

`sync-articles.sh` 严格按组隔离 `--delete`，不会跨组清理。新增 skill ↔ 组的映射，编辑 `scripts/sync-articles.sh` 的 `SKILL_GROUPS` 数组。

### 方式 B：直接在仓库内编辑（适合 immigration 组等通过 git/UI 管理的组）

直接在 `src/content/articles/<group>/YYYY-MM-DD/` 下新建 markdown，按 PR 流程合并。或者用站内 `/new` 和 `/edit` UI。

Cloudflare Pages 自动部署。

## 部署

- **Hosting**: Cloudflare Pages
- **Domain**: sakuapi.com
- **Build command**: `npm run build`
- **Build output**: `dist/`

## 技术栈

- [Astro 6](https://astro.build) — 静态站点生成
- [Tailwind CSS 4](https://tailwindcss.com) — 样式
- Markdown — 内容源
