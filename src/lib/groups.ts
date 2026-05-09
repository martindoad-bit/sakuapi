// 内容组定义。新增组：在这里加一行，并在 src/content/articles/ 下建对应目录。
// 权限通过 Cloudflare Access 配置（按 URL 路径），不在前端做。

export interface Group {
  key: string;        // URL 路径 + 文件夹名
  name: string;       // 显示名
  description: string;
  color: string;      // tailwind color 名
  hidden?: boolean;   // 不在主页卡片和顶部导航显示
}

export const GROUPS: Group[] = [
  {
    key: 'shared',
    name: '共享',
    description: '所有人都能看到的公共资料',
    color: 'slate',
  },
  {
    key: 'restaurant',
    name: '餐饮组',
    description: '在日华人中餐自媒体内容',
    color: 'orange',
  },
  {
    key: 'immigration',
    name: '移民组',
    description: '日本移民 / 永驻 / 高才 / 经管签内容',
    color: 'sky',
  },
  {
    key: 'backup1',
    name: '备选 1',
    description: '待启用',
    color: 'neutral',
  },
  {
    key: 'gyosei',
    name: '行政书士文案',
    description: '行政书士業務コンテンツ',
    color: 'teal',
    hidden: true,
  },
];

export function getGroup(key: string): Group | undefined {
  return GROUPS.find((g) => g.key === key);
}

export function colorClasses(color: string) {
  // tailwind 4 不能动态拼 class，必须列举
  const map: Record<string, { border: string; text: string; hover: string; bg: string }> = {
    orange: {
      border: 'hover:border-orange-400',
      text: 'group-hover:text-orange-700 text-orange-700',
      hover: 'hover:text-orange-700',
      bg: 'bg-orange-50',
    },
    sky: {
      border: 'hover:border-sky-400',
      text: 'group-hover:text-sky-700 text-sky-700',
      hover: 'hover:text-sky-700',
      bg: 'bg-sky-50',
    },
    slate: {
      border: 'hover:border-slate-400',
      text: 'group-hover:text-slate-700 text-slate-700',
      hover: 'hover:text-slate-700',
      bg: 'bg-slate-50',
    },
    neutral: {
      border: 'hover:border-neutral-400',
      text: 'group-hover:text-neutral-700 text-neutral-700',
      hover: 'hover:text-neutral-700',
      bg: 'bg-neutral-50',
    },
    teal: {
      border: 'hover:border-teal-400',
      text: 'group-hover:text-teal-700 text-teal-700',
      hover: 'hover:text-teal-700',
      bg: 'bg-teal-50',
    },
  };
  return map[color] || map.neutral;
}
