import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Cover alt is required; an empty alt is only valid for decorative covers.
const cover = (image: () => z.ZodType) =>
  z.object({ image: image(), alt: z.string(), decorative: z.boolean().default(false) })
    .refine((c) => c.alt !== '' || c.decorative, {
      message: 'cover.alt must not be empty unless cover.decorative is true',
      path: ['alt'],
    });

const writeups = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writeups' }),
  schema: ({ image }) =>
    z.object({
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
      publishAfter: z.coerce.date().optional(),
      cover: cover(image).optional(),
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
    publishAfter: z.coerce.date().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }), // id = file name = repo name
  schema: ({ image }) =>
    z.object({
      repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'expected "owner/name"'),
      draft: z.boolean().default(false),
      title: z.string().optional(),
      demo: z.url().optional(),
      cover: cover(image).optional(),
    }),
});

export const collections = { writeups, notes, projects };
