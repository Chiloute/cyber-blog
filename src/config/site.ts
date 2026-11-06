// Single source of truth for site-wide constants.

export const AUTHOR = 'chiloute';
export const SITE_TITLE = 'chiloute';
export const SITE_DESCRIPTION = 'CTF writeups, security notes and small projects.';
export const SITE_URL = 'https://chiloute.fr';

export const EMAIL_PLACEHOLDER = 'TODO@example.invalid';
export const CONTACT_EMAIL: string = EMAIL_PLACEHOLDER; // TODO: set the real contact address
export const isEmailPlaceholder = (): boolean => CONTACT_EMAIL === EMAIL_PLACEHOLDER;

export const socialLinks = [
  // TODO: confirm the GitHub profile URL
  { name: 'GitHub', url: 'https://github.com/chiloute' },
] as const;

export interface CtfProfile {
  name: string;
  url: string;
  enabled: boolean;
}

export const ctfProfiles: CtfProfile[] = [
  { name: 'Root-Me', url: 'https://www.root-me.org/TODO', enabled: false }, // TODO: set url and enable
  { name: 'HackTheBox', url: 'https://app.hackthebox.com/users/TODO', enabled: false }, // TODO: set url and enable
  { name: 'TryHackMe', url: 'https://tryhackme.com/p/TODO', enabled: false }, // TODO: set url and enable
  { name: 'CTFtime', url: 'https://ctftime.org/user/TODO', enabled: false }, // TODO: set url and enable
];

export const cv: { path: string | null } = {
  path: null, // TODO: e.g. '/cv.pdf' once the PDF is added to public/
};

export interface Certification {
  name: string;
  issuer: string;
  year: number;
  verifyUrl: string;
  enabled: boolean;
}

export const certifications: Certification[] = [
  // TODO: replace with real certifications, set enabled: true
  { name: 'TODO Certification', issuer: 'TODO Issuer', year: 2026, verifyUrl: 'https://example.invalid/verify', enabled: false },
];

export const licenses = {
  content: { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  code: { name: 'MIT' },
} as const;

export const securityTxt = {
  expires: '2027-10-06T00:00:00.000Z', // ~11 months; renew before expiry
  pgpKeyPath: '/pgp-key.txt',
} as const;

// Placeholders: T3 finalizes these.
export const themeColors = {
  light: '#faf8f3',
  dark: '#0b0f14',
} as const;
