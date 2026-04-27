# Sakuapi

在日华人餐饮内容站 · 内部团队共享。

## 本地开发

```sh
npm install
npm run dev
# → http://localhost:4321
```

## 同步新文章

写在 `~/.claude/skills/japan-cn-restaurant-media/drafts/` 下的 markdown 文件，运行：

```sh
./scripts/sync-articles.sh
git add -A
git commit -m "同步新文章"
git push
```

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
