import { aws01 } from './aws01-root-mfa.js';
import { aws02 } from './aws02-no-root-keys.js';
import { aws03 } from './aws03-s3-public-access.js';
import { aws04 } from './aws04-cloudtrail.js';
import { aws05 } from './aws05-ebs-encryption.js';
import { aws06 } from './aws06-rds-encryption.js';
import { aws07 } from './aws07-password-policy.js';
import { aws08 } from './aws08-sg-ingress.js';
import { aws09 } from './aws09-access-key-rotation.js';
import { aws10 } from './aws10-s3-encryption.js';

export const awsChecks = [
  aws01,
  aws02,
  aws03,
  aws04,
  aws05,
  aws06,
  aws07,
  aws08,
  aws09,
  aws10,
];

export {
  aws01,
  aws02,
  aws03,
  aws04,
  aws05,
  aws06,
  aws07,
  aws08,
  aws09,
  aws10,
};
