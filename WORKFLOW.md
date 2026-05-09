# Sakuapi 内容工作流标准

> 所有窗口通用。写手、审稿员、工程窗口各读各的部分。
> 最后更新：2026-05-09

---

## 稿件存放位置

| 组 | 草稿目录 |
|----|---------|
| 餐饮组 | `~/.claude/skills/japan-cn-restaurant-media/drafts/restaurant/YYYY-MM-DD/` |
| 移民组 | `~/.claude/skills/japan-immigration-content/drafts/immigration/YYYY-MM-DD/` |
| 行政书士 | 直接在 sakuapi.com `/gyosei/` 页面新建 |

文件命名：`NN-标题关键词.md`（如 `01-深夜酒类提供.md`）

---

## frontmatter 最低字段

```yaml
---
title: "文章标题"
date: "2026-05-09"
status: drafting
assignee: "写手名"
platform: ["xiaohongshu"]
tags: []
sources_claimed:
  - url: "https://..."
    tier: 1
    date: "2026-05-01"
    note: "说明这条信源证明了什么"
notes: ""
---
```

---

## 工作流（每篇稿件）

```
写手写完 → status 改为 review → 直接通知审稿员
审稿员审完 → 结论写入 notes → status 改为 editing → 直接通知写手
写手看结论 → P0 必须修改 → P1/P2 标注即可不用改 → 通知工程窗口"可以部署"
工程窗口 → sync + deploy
```

**注意：**
- 写手和审稿员直接沟通，不通过创始人
- 工程窗口不参与内容审核，只负责 deploy
- 创始人只在需要裁决时介入

---

## 审稿结论说明（写手看这里）

审稿员会在 notes 字段写入结论，格式如下：

```
✅ FACT-OK 2026-05-09          ← 全部通过，直接告知工程部署
🟡 P1：F7 数字口径未注明       ← 标注即可，不用修改，可以部署
🔵 P2：建议补 e-Gov 链接       ← 提示，不影响部署
❌ FACT-FAIL | P0：F3 条文编号错误  ← 必须改掉，改完才能部署
⚠️ 限流风险：XXX               ← 你自己判断要不要改，不影响部署
```

### 三级结论处理方式

| 级别 | 含义 | 写手要做什么 |
|------|------|------------|
| P0 致命 | 事实硬错，误导读者 | **必须修改**，改完即可部署，不再复审 |
| P1 中等 | 信源不足或口径不清 | 标注保留，无需修改，可以部署 |
| P2 低风险 | 措辞模糊或建议补链 | 标注保留，无需修改，可以部署 |

**只做一次审查，不做二次复审。P0 改完后写手自己确认，直接告知工程部署。**

---

## 部署触发条件

工程窗口收到以下任意一条即可部署，无需等待创始人确认：

- 「P0 已修改，可以部署」
- 「通过，可以部署」
- 「P1/P2 标注保留，可以部署」

---

## 审稿员看这里

**⚠️ 重要：审稿的是本地草稿目录，不是网站内容，不是 src/content/articles/。**

草稿目录（按组）：

| 组 | 审稿目录（就是这里，不是别的地方） |
|----|----------------------------------|
| 餐饮组 | `~/.claude/skills/japan-cn-restaurant-media/drafts/restaurant/` |
| 移民组 | `~/.claude/skills/japan-immigration-content/drafts/immigration/` |

每次审稿流程：
1. 读上面草稿目录下 `status: review` 的文章（没有 status 字段的也算待审）
2. 对照 `~/.claude/skills/japan-immigration-content/checks.md`（F1-F9）逐条核查
3. 在 notes 字段写入结论（格式见上文）
4. status 改为 `editing`（无论通过与否）
5. 直接通知写手看结论

**不替写手修改正文。不做第二次审查。**

---

## 工程窗口看这里

**部署前必须确认：草稿已在 `status: editing` 或写手明确说「可以部署」。**

```bash
cd /Users/martin/Documents/sakuapi
./scripts/deploy.sh
```

deploy.sh 会自动：同步草稿 → 构建 → 上传 Cloudflare Pages
