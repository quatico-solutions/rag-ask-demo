interface BitbucketPullRequestComment {
  id: number;
  created_on: string;
  updated_on: string;
  content: {
    type: "rendered";
    raw: string;
    markup: "markdown";
    html: string;
  };
  user: {
    display_name: string;
    links: {
      self: { href: string };
      avatar: { href: string };
      html: { href: string };
    };
    type: "user";
    uuid: string;
    account_id: string;
    nickname: string;
  };
  deleted: boolean;
  parent?: {
    id: number;
    links: {
      self: { href: string };
      html: { href: string };
    };
  };
  inline: {
    from: number | null;
    to: number;
    path: string;
  };
  pending: boolean;
  type: "pullrequest_comment";
  links: {
    self: { href: string };
    html: { href: string };
    code: { href: string };
  };
  pullrequest: {
    type: "pullrequest";
    id: number;
    title: string;
    draft: boolean;
    links: {
      self: { href: string };
      html: { href: string };
    };
  };
  resolution?: Record<string, unknown>;
}

interface BitbucketPullRequestCommentsResponse {
  values: BitbucketPullRequestComment[];
  pagelen: number;
  size: number;
  page: number;
}
