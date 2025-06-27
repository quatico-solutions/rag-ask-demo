interface BitbucketLinks {
  self: { href: string };
  html: { href: string };
  avatar?: { href: string };
}

interface RenderedContent {
  type: "rendered";
  raw: string;
  markup: "markdown";
  html: string;
}

interface User {
  display_name: string;
  links: BitbucketLinks;
  type: "user";
  uuid: string;
  account_id: string;
  nickname: string;
}

interface Commit {
  hash: string;
  links: {
    self: { href: string };
    html: { href: string };
  };
  type: "commit";
}

interface Repository {
  type: "repository";
  full_name: string;
  links: BitbucketLinks;
  name: string;
  uuid: string;
}

interface Branch {
  name: string;
  links?: Record<string, unknown>;
  sync_strategies?: string[];
}

interface BranchDestination {
  branch: { name: string };
  commit: Commit;
  repository: Repository;
}

interface BranchSource {
  branch: Branch;
  commit: Commit;
  repository: Repository;
}

interface Participant {
  type: "participant";
  user: User;
  role: "REVIEWER" | "PARTICIPANT";
  approved: boolean;
  state: "approved" | null;
  participated_on: string;
}

interface PullRequestLinks {
  self: { href: string };
  html: { href: string };
  commits: { href: string };
  approve: { href: string };
  "request-changes": { href: string };
  diff: { href: string };
  diffstat: { href: string };
  comments: { href: string };
  activity: { href: string };
  merge: { href: string };
  decline: { href: string };
  statuses: { href: string };
}

interface BitbucketPullRequest {
  comment_count: number;
  task_count: number;
  type: "pullrequest";
  id: number;
  title: string;
  description: string;
  rendered: {
    title: RenderedContent;
    description: RenderedContent;
  };
  state: "MERGED" | "OPEN" | "DECLINED";
  draft: boolean;
  merge_commit: Commit;
  close_source_branch: boolean;
  closed_by: User;
  author: User;
  reason: string;
  created_on: string;
  updated_on: string;
  destination: BranchDestination;
  source: BranchSource;
  reviewers: User[];
  participants: Participant[];
  links: PullRequestLinks;
  summary: RenderedContent;
}