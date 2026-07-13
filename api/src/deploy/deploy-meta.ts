export type DeployMeta = {
  projectSlug: string;
  branch: string;
  branchSlug: string;
  pm2Name: string;
  port: number;
  runner?: 'pm2' | 'docker';
};
