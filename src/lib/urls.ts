export type PostCollection = 'writeups' | 'notes';

export const postUrl = (collection: PostCollection, id: string): string => `/${collection}/${id}/`;
export const ogPath = (collection: PostCollection, id: string): string => `/og/${collection}/${id}.png`;
export const tagUrl = (tag: string): string => `/writeups/tags/${tag}/`;
