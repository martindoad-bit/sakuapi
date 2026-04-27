import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().optional(),
    date: z.string().optional(),
    // 工作流字段
    status: z.string().optional(),
    assignee: z.string().optional(),
    platform: z.array(z.string()).optional(),
    shoot_date: z.string().optional(),
    publish_date: z.string().optional(),
    publish_url: z.string().optional(),
    tags: z.array(z.string()).optional(),
    cover_idea: z.string().optional(),
    notes: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { articles };
