export const SITE = {
  url: 'https://blog.zohdi.me',
  title: 'Zohdi blog',
  description: 'Notes from building for the web, by Mahmoud Zohdi.',
  author: 'Mahmoud Zohdi',
  personId: 'https://zohdi.me/#person',
  links: {
    home: 'https://zohdi.me/',
    github: 'https://github.com/mahmoudzohdi',
    linkedin: 'https://www.linkedin.com/in/mahmoudzohdi/',
    repo: 'https://github.com/mahmoudzohdi/blog',
  },
};

/**
 * giscus comments, stored in GitHub Discussions of the blog repo. The Announcements category
 * means only the repo owner and giscus can start threads. Comments stay off while an id is empty.
 */
export const GISCUS: { repo: string; repoId: string; category: string; categoryId: string } = {
  repo: 'mahmoudzohdi/blog',
  repoId: 'R_kgDOVfuPgA',
  category: 'Announcements',
  categoryId: 'DIC_kwDOVfuPgM4DKMUE',
};

/** Umami Cloud website shared with zohdi.me (the free plan allows one). Empty = no analytics script. */
export const UMAMI_WEBSITE_ID: string = '2b364816-579c-476f-8b2a-5e5a7c14c8e7';
