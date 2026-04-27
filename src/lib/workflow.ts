// 自媒体协作工作流 schema。
// 状态、平台、字段定义集中在这里，前后端共用。

export interface Status {
  key: string;
  label: string;
  color: string;       // tailwind 色名
  bg: string;          // 完整 class
  text: string;
  border: string;
  ring: string;
}

export const STATUSES: Status[] = [
  { key: 'drafting',  label: '写稿中',   color: 'blue',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    ring: 'ring-blue-300' },
  { key: 'review',    label: '待审核',   color: 'amber',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   ring: 'ring-amber-300' },
  { key: 'shooting',  label: '待拍摄',   color: 'purple',  bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  ring: 'ring-purple-300' },
  { key: 'editing',   label: '待剪辑',   color: 'pink',    bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    ring: 'ring-pink-300' },
  { key: 'scheduled', label: '待发布',   color: 'cyan',    bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    ring: 'ring-cyan-300' },
  { key: 'published', label: '已发布',   color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-300' },
  { key: 'archived',  label: '归档',     color: 'neutral', bg: 'bg-neutral-100',text: 'text-neutral-600', border: 'border-neutral-300', ring: 'ring-neutral-300' },
];

export const STATUS_BY_KEY: Record<string, Status> = Object.fromEntries(
  STATUSES.map((s) => [s.key, s]),
);

export function getStatus(key: string | undefined): Status {
  return STATUS_BY_KEY[key || ''] || STATUSES[0];
}

export interface Platform {
  key: string;
  label: string;
  emoji: string;
}

export const PLATFORMS: Platform[] = [
  { key: 'xiaohongshu', label: '小红书',   emoji: '📕' },
  { key: 'douyin',      label: '抖音',     emoji: '🎵' },
  { key: 'wechat',      label: '公众号',   emoji: '📰' },
  { key: 'weishipin',   label: '视频号',   emoji: '🎬' },
  { key: 'bilibili',    label: 'B 站',     emoji: '📺' },
  { key: 'youtube',     label: 'YouTube',  emoji: '▶️' },
  { key: 'twitter',     label: 'X / Twitter', emoji: '𝕏' },
  { key: 'other',       label: '其他',     emoji: '🔗' },
];

export const PLATFORM_BY_KEY: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p]),
);

// 文章 frontmatter 字段
export interface Workflow {
  status?: string;             // 见 STATUSES
  assignee?: string;           // 责任人
  platform?: string[];         // 平台 keys
  shoot_date?: string;         // YYYY-MM-DD
  publish_date?: string;       // YYYY-MM-DD
  publish_url?: string;
  tags?: string[];
  cover_idea?: string;
  notes?: string;
  date?: string;               // 创建/批次日期（自动）
  title?: string;
}
