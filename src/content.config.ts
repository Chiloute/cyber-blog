import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writeups = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writeups' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    ctf: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(['web', 'pwn', 'crypto', 'forensic', 'reverse', 'misc', 'osint']),
    difficulty: z.enum(['easy', 'medium', 'hard', 'insane']),
    points: z.number().optional(),
    tags: z.array(z.string()).default([]),
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
    tags: z.array(z.string()).default([]),
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
