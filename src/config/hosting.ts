// Host identity for the legal notice. The hosting provider is not chosen yet:
// replace every TODO below once it is (isHostPlaceholder then turns false).
export const HOST_PLACEHOLDER = 'TODO';
export const host = {
  name: HOST_PLACEHOLDER,
  address: HOST_PLACEHOLDER,
  phone: HOST_PLACEHOLDER,
  website: HOST_PLACEHOLDER,
} as const;
export const isHostPlaceholder = (v: string = host.name): boolean => v === HOST_PLACEHOLDER;
