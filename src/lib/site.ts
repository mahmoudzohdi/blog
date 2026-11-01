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

/** Filled in at launch (Task 27). Comments stay off while repoId or categoryId is empty. */
export const GISCUS: { repo: string; repoId: string; category: string; categoryId: string } = {
  repo: 'mahmoudzohdi/blog',
  repoId: '',
  category: 'Comments',
  categoryId: '',
};

/** Filled in at launch (Task 28). No analytics script is rendered while this is empty. */
export const UMAMI_WEBSITE_ID: string = '';
