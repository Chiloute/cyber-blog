import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES, DIFFICULTIES } from './config/taxonomy.ts';

const writeups = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writeups' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    ctf: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(CATEGORIES),
    difficulty: z.enum(DIFFICULTIES),
    points: z.number().optional(),
    tags: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'tags must be lowercase kebab-case')).default([]),
    team: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'tags must be lowercase kebab-case')).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }), // id = file name = repo name in src/data/projects.json
  schema: z.object({
    draft: z.boolean().default(false),
    title: z.string().optional(),
  }),
});

export const collections = { writeups, notes, projects };
