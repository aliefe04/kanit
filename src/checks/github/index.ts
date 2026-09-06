import { gh01 } from './gh01-org-2fa.js';
import { gh02 } from './gh02-branch-protection.js';
import { gh03 } from './gh03-approving-reviews.js';
import { gh04 } from './gh04-prevent-force-pushes.js';
import { gh05 } from './gh05-signed-commits.js';
import { gh06 } from './gh06-dependabot-secrets.js';
import { gh07 } from './gh07-dismiss-stale-approvals.js';

export const githubChecks = [
  gh01,
  gh02,
  gh03,
  gh04,
  gh05,
  gh06,
  gh07,
];

export {
  gh01,
  gh02,
  gh03,
  gh04,
  gh05,
  gh06,
  gh07,
};
