# Sakuapi 工程交接文档

> 给下一个 Claude Code 会话或工程师阅读。读完这一份就能接手维护 + 迭代。

## TL;DR

- **Sakuapi** = 内部团队内容工作站
- 网址 https://sakuapi.com（含 www. 跳转）
- 受众：4 个内部小组（共享 / 餐饮组 / 移民组 / 备选 1）
- 功能：浏览文章、新建/编辑/删除文章、按状态筛选、看板拖拽、日历视图
- 登录方式：Cloudflare Access Email OTP（白名单 4 个邮箱）
- 内容存储：GitHub repo `martindoad-bit/sakuapi` 下的 markdown 文件
- 部署：Cloudflare Pages（Direct Upload via wrangler，**不**走 Git auto-deploy）

---

## 项目位置

```
/Users/martin/Documents/sakuapi/
```

本地有 git working copy，远程是 [github.com/martindoad-bit/sakuapi](https://github.com/martindoad-bit/sakuapi)。

---

## 技术栈

| 层 | 选择 |
|---|---|
| Framework | Astro 6 |
| 样式 | Tailwind 4 |
| 内容 | Markdown + YAML frontmatter (Astro Content Collections) |
| 编辑器 | EasyMDE (CDN, no npm dep) + marked.js |
| 后端 | Cloudflare Pages Functions（functions/ 目录） |
| 内容存储 | GitHub Contents API（不是数据库） |
| 部署 | Cloudflare Pages，wrangler CLI 直传 dist |
| 认证 | Cloudflare Access (Email OTP)，session 720h |

**没有数据库、没有用户表、没有 cookie session 自管理** —— 所有「身份」从 CF Access JWT 解出。

---

## 文件结构

```
sakuapi/
├── src/
│   ├── content/
│   │   └── articles/               # 文章源（按 group/batch/file 三层）
│   │       ├── shared/
│   │       ├── restaurant/2026-04-27/01-...md
│   │       ├── immigration/
│   │       └── backup1/
│   ├── content.config.ts           # Astro Content schema（含 workflow 字段）
│   ├── components/
│   │   └── WorkflowFields.astro    # 协作字段表单组件
│   ├── lib/
│   │   ├── articles.ts             # getAllArticles + groupByBatch
│   │   ├── groups.ts               # 4 组定义（key/name/color/desc）
│   │   └── workflow.ts             # STATUSES + PLATFORMS 枚举
│   ├── layouts/
│   │   └── Layout.astro            # 全局头/尾，所有页面共用
│   ├── pages/
│   │   ├── index.astro             # 首页：4 组卡片 + 最近活动
│   │   ├── [group]/index.astro     # 组列表：实时拉 /api/list
│   │   ├── [...slug].astro         # 文章详情（静态生成）
│   │   ├── new.astro               # 新建（标题/分组/正文 + 折叠的高级）
│   │   ├── edit.astro              # 编辑（?path=...）
│   │   ├── board.astro             # 看板（拖拽改 status）
│   │   ├── calendar.astro          # 日历（按 shoot_date / publish_date）
│   │   ├── manage.astro            # 全部文章管理视图
│   │   └── about.astro
│   └── styles/global.css           # tailwind + 自定义 prose
├── functions/                      # Cloudflare Pages Functions
│   ├── _lib/
│   │   ├── auth.ts                 # 从 CF Access JWT 解 email
│   │   └── github.ts               # GitHub Contents API 封装
│   ├── api/
│   │   ├── me.ts                   # GET 当前登录邮箱
│   │   ├── list.ts                 # GET 文章列表（支持 ?frontmatter=1）
│   │   ├── article.ts              # GET/POST/DELETE 单篇
│   │   └── upload.ts               # POST 图片上传
│   └── types.d.ts
├── public/
│   ├── scripts/
│   │   └── frontmatter.js          # 客户端 YAML 解析/序列化
│   └── uploads/                    # 用户上传的图片（GitHub commit 进来）
├── scripts/
│   ├── deploy.sh                   # 一键部署
│   └── sync-articles.sh            # （存在则）从 skill drafts 同步
├── astro.config.mjs                # Astro + Tailwind vite 插件
├── package.json
├── .env                            # 凭证（GitIgnored，看下面）
├── .gitignore
└── HANDOFF.md                      # 本文件
```

---

## 凭证 / 配置

`.env` 在本地（**已 gitignored**），生产环境的 secret 已通过 wrangler 配到 CF Pages。

```bash
# .env (本地)
CLOUDFLARE_API_TOKEN=cfat_xxx          # Pages Edit + DNS Edit + Access Edit
CLOUDFLARE_ACCOUNT_ID=1b2c99c8295f25de2fb2a6cdcfd48a82
CLOUDFLARE_ZONE_ID=3750835b6a26c99f21a9ccd28dc927fe
PAGES_PROJECT=sakuapi
GITHUB_TOKEN=gho_xxx                    # gh CLI 的 user token，scope: repo
GITHUB_REPO=martindoad-bit/sakuapi
```

**生产环境同名 secret** 已通过 CF API 配置好（`production` + `preview` 两套）。
查看：`curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/pages/projects/sakuapi -H "Authorization: Bearer $TOKEN"`

⚠️ **GITHUB_TOKEN 是用户 OAuth token**（来自 `gh auth token`），有 `repo` scope。会过期/可被用户撤销。长期方案：换成 fine-grained PAT 或 GitHub App。短期足够。

---

## Cloudflare Access 配置

| 项 | 值 |
|---|---|
| Team domain | `sakuapi.cloudflareaccess.com` |
| Application | "Sakuapi 内部站" id=`66501e66-e7ae-40e4-83b0-91072d3a2785` |
| Application AUD | `6e31c95c51119ce6b91837ea116ff6135784262bd4c03620f2f1b8fc31deecb4` |
| Domain | `sakuapi.com`（覆盖全站） |
| Session | 720h（30 天） |
| IdP | Email OTP id=`d451e6d4-66aa-4d7a-83f7-48c300116111`（CF 内置，无需额外配置） |
| Policy | "Allow all team members" id=`0117ce08-b9ec-45a0-a555-fae02b70d96e` |
| 白名单 | martindoad@gmail.com, novem8877@keio.jp, 1979650542@qq.com, 1093433813@qq.com |

**加邮箱 API 示例**：
```bash
TOKEN="..." ACCOUNT="..." APP_ID="..." POLICY_ID="..."
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/access/apps/$APP_ID/policies/$POLICY_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{
    "name": "Allow all team members",
    "decision": "allow",
    "include": [
      {"email": {"email": "martindoad@gmail.com"}},
      {"email": {"email": "新邮箱@xx.com"}}
    ],
    "precedence": 1
  }'
```

---

## DNS 配置（CF Zone）

```
sakuapi.com         CNAME  sakuapi.pages.dev   proxied=true
www.sakuapi.com     CNAME  sakuapi.pages.dev   proxied=true
api.sakuapi.com     A      57.182.149.54       proxied=true   # 别动！是用户的别的服务
chat.sakuapi.com    A      57.182.149.54       proxied=true   # 同上
send.sakuapi.com    ...                                        # 邮件相关
MX/TXT 记录                                                    # 邮件相关，别动
```

**只有 `sakuapi.com` 和 `www.sakuapi.com` 是这个项目的**，其他子域名是用户其他服务。

---

## 关键概念

### 1. 文章数据流

新建 / 编辑 → 客户端 fetch 到 `/api/article` → Pages Function 用 GitHub Contents API 提交 commit → CF Pages 检测到 git push **不会触发自动部署**（因为 GitHub 集成没接通过 OAuth 失败）→ **必须手动跑 `npm run build` + wrangler deploy** 才能看到首页/详情页有新文章

⚠️ 这是已知的不一致：编辑动作"立即生效"（API 直接读 GitHub），但**静态生成的首页和详情页要重新部署才更新**。

**解决方案**（当前权宜之计）：
- 列表页和组页是 client-side fetch，所以新文章立即可见
- 文章详情页 `[...slug].astro` 是构建时静态生成，需要重新部署才有
- 用户经常需要的话，要么改用 SSR / on-demand revalidation，要么加 GitHub Action 自动部署

### 2. Frontmatter Schema（在 `src/lib/workflow.ts` 定义）

```yaml
---
title: "文章标题"
date: "2026-04-27"          # 批次日期
status: drafting             # drafting/review/shooting/editing/scheduled/published/archived
assignee: "王师傅"
platform: ["xiaohongshu", "douyin"]   # 见 PLATFORMS 枚举
shoot_date: "2026-05-10"
publish_date: "2026-05-15"
publish_url: "https://..."
tags: ["租约", "踩坑"]
cover_idea: "店主签合同那一刻的镜头"
notes: |
  内部协作备注，可多行
---
```

### 3. CF Access JWT → email 解析

`functions/_lib/auth.ts` 里：CF Access **不会自动塞** `Cf-Access-Authenticated-User-Email` header（除非在 dashboard 单独开），所以代码用 `Cf-Access-Jwt-Assertion` JWT，base64 decode 拿 email。**没验签**（依赖 host=sakuapi.com 校验防绕过）。

如果要正式安全审计，加 JWKS 验签：
```
JWKS URL: https://sakuapi.cloudflareaccess.com/cdn-cgi/access/certs
```

### 4. 4 个组定义（`src/lib/groups.ts`）

```ts
shared       共享       slate
restaurant   餐饮组     orange
immigration  移民组     sky
backup1      备选 1     neutral
```

加新组：`groups.ts` 加一行 + `src/content/articles/<key>/` 建目录 + `npm run build` + 部署。Tailwind 颜色不能动态拼，必须在 `colorClasses()` 里列举。

---

## 常用操作

### 部署
```bash
cd /Users/martin/Documents/sakuapi
./scripts/deploy.sh
# 或者:
npm run build
CLOUDFLARE_API_TOKEN=$CF_TOKEN npx wrangler pages deploy dist \
  --project-name=sakuapi --branch=main \
  --commit-message="..." --commit-dirty=true
```

### 本地开发
```bash
npm run dev                                                    # 只起 Astro，看不到 API
npx wrangler pages dev dist --compatibility-date=2026-04-27    # 完整跑 Functions（需先 build）
```

本地 dev 时 `auth.ts` 会因为 host=localhost 自动给 `dev@local` 身份，无需 CF Access。

### 加新组员邮箱
见上文「Cloudflare Access 配置」部分的 API 示例，或让用户去 dashboard。

### 手动 commit / push
```bash
cd /Users/martin/Documents/sakuapi
git add -A
git commit -m "..."
git push     # 推到 origin/main
```

---

## 已知问题 / 待办

### 🔴 高优先级
- [ ] **新文章详情页要等部署**（前述）。理想方案：加 GitHub Action 接 webhook，每次 push 自动 `wrangler pages deploy`
- [ ] **GITHUB_TOKEN 用的是用户 OAuth token**，会过期。换成长期 PAT 或 GitHub App
- [ ] **图片上传走 GitHub commit**，每张图 1 个 commit 很丑，且大图会撑大 repo。考虑迁到 R2 / KV
- [ ] **CF Access JWT 没验签**（host 校验勉强够用）。生产严肃化要加 JWKS 验签

### 🟡 中优先级
- [ ] 提交后跳转到组页，但组页是 client-side fetch，要等 GitHub API 同步。给个 1.5s 延迟可能不够。改成"提交后显示『正在同步…』+ 真正轮询 /api/list 直到看到新文章"
- [ ] 编辑器的 EasyMDE autosave 是 localStorage，跨设备不同步。改成保存草稿到 GitHub branch
- [ ] 看板拖拽改 status 没有 optimistic UI，每次都是「等 API 完成 → re-render」，体感慢
- [ ] manage.astro 列表很基础，可以加搜索、按时间排序、按责任人筛选

### 🟢 低优先级 / nice-to-have
- [ ] 团队管理页面 `/team`：列出当前 Access 白名单，按钮加/删邮箱
- [ ] 评论 / 内部 @ 提及：可以基于 issue 表（GitHub Issues 同步）
- [ ] 数据统计：哪些文章被编辑得最多 / 哪个组最活跃
- [ ] 双语 UI（如果有日本同事）

### 🟢 用户已说不需要做
- 同事用 GitHub 直接编辑 → 用户明确说**不要 GitHub**，所有人都走网页
- 看板和日历的复杂功能 → 用户说**保持简单**，主流程是上传/编辑/留档
- 多组权限隔离 → 用户说**全局可见**就行，所有组所有人都能看到

---

## 业务背景（不影响代码但有助于理解）

- 用户做 **3-4 条业务线的内容自媒体**：日本中餐、日本移民、备选方向
- 团队 4 人左右
- 每条业务线对应 1 个组目录
- 内容形态：**短视频脚本 + 图文内容**，会发到小红书/抖音/公众号/视频号等
- 工作流：选题 → 写稿 → 审核 → 拍摄 → 剪辑 → 发布 → 归档
- 这就是为什么 frontmatter 字段设计成 status/shoot_date/publish_date/platform 这样

**用户对工程的偏好**：
- 最简单的 UX，不要复杂表单
- 不要让同事接触 git/markdown 概念
- 不要装 App，浏览器 + 邮箱就能用
- 出错时给具体错误信息，不要静默失败

---

## 历史决策

1. **为什么不用 Git auto-deploy**：CF Pages 接 GitHub OAuth 时一直跳转失败，最后用 wrangler 直传。如果要恢复 Git auto-deploy，去 [CF Pages dashboard](https://dash.cloudflare.com/?to=/:account/workers-and-pages) 重新连接 GitHub
2. **为什么不用 CMS（Decap/Sveltia）**：用户不想让同事接触 GitHub 账户，那些 CMS 都需要 GitHub OAuth 给写者
3. **为什么内容存 GitHub 而不是 D1/R2**：版本可追溯、git 历史就是审计日志、迁移成本零、没有数据库费用
4. **为什么用 Astro 而不是 Next.js**：纯静态站 + 少量 API，Astro 更轻、构建更快、SEO 默认好
5. **为什么 Pages Functions 不用 Astro SSR adapter**：解耦后端，避免引入 Astro Cloudflare adapter 的复杂性
6. **为什么 frontmatter 用客户端 JS 解析而不是 npm gray-matter**：减少打包体积，定制更灵活

---

## 联系方式 / 责任

**项目所有者**：martindoad@gmail.com  
**GitHub**：martindoad-bit  
**Cloudflare 账户**：Martindoad@gmail.com  

如果是新 Claude 会话接手：可以直接读这个文档，然后跑 `./scripts/deploy.sh` 验证环境通。所有信息齐全。

---

*本文档由 Claude 在 2026-04-27 整理。后续重大改动请同步更新。*
