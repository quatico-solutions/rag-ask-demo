import * as fs from 'node:fs';
import path from 'node:path';

const fetchPullRequestComments = async (args: string[]): Promise<BitbucketPullRequestComment[]> => {

  const prNumber = args[0];

  if (!prNumber || isNaN(Number(prNumber)) || Number(prNumber) <= 0) {
    console.error('Error: Please provide a valid pull request id as an argument');
    process.exit(1);
  }

  console.log(`Fetching comments for pull request #${prNumber}...`);

  const url = `https://api.bitbucket.org/2.0/repositories/quatico/mchweb/pullrequests/${prNumber}/comments`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(process.env.PERSONAL_E_MAIL + ":" + process.env.PERSONAL_ACCESS_TOKEN).toString('base64'),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const commentsData: BitbucketPullRequestCommentsResponse = await response.json() as BitbucketPullRequestCommentsResponse;

  console.log(JSON.stringify(commentsData, null, 2));

  return commentsData.values || [];
};

const fetchPullRequest = async (prId: string): Promise<BitbucketPullRequest> => {

  if (!prId || isNaN(Number(prId)) || Number(prId) <= 0) {
    console.error('Error: Please provide a valid pull request id as an argument');
    process.exit(1);
  }

  console.log(`Fetching comments for pull request #${prId}...`);

  const url = `https://api.bitbucket.org/2.0/repositories/quatico/mchweb/pullrequests/${prId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(process.env.PERSONAL_E_MAIL + ":" + process.env.PERSONAL_ACCESS_TOKEN).toString('base64'),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const commentsData: BitbucketPullRequest = await response.json() as BitbucketPullRequest;

  console.log(JSON.stringify(commentsData, null, 2));

  return commentsData;
};



const fetchPullRequestDiff = async (prId: string): Promise<string> => {

  if (!prId || isNaN(Number(prId)) || Number(prId) <= 0) {
    console.error('Error: Please provide a valid pull request id as an argument');
    process.exit(1);
  }

  console.log(`Fetching comments for pull request #${prId}...`);

  const url = `https://api.bitbucket.org/2.0/repositories/quatico/mchweb/pullrequests/${prId}/diff`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/plain',
      'Authorization': 'Basic ' + Buffer.from(process.env.PERSONAL_E_MAIL + ":" + process.env.PERSONAL_ACCESS_TOKEN).toString('base64'),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.text();
};

const searchPullRequestsByText = async (args: string[]): Promise<string[]> => {

  const searchQuery = args[0];

  const baseUrl = 'https://api.bitbucket.org/2.0/repositories/quatico/mchweb/pullrequests';

  const query = searchQuery.split(',').map(queryPart => `description~"${queryPart}" OR title~"${queryPart}"`).join(' OR ');

  const params = new URLSearchParams({
    q: `(${query})`,
  });

  const url = `${baseUrl}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(process.env.PERSONAL_E_MAIL + ":" + process.env.PERSONAL_ACCESS_TOKEN).toString('base64'),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  let pullRequestsData = await response.json();

  let prIds = (pullRequestsData.values || []).map((pr: { id: string; }) => pr.id);

  console.log(JSON.stringify(prIds, null, 2));

  return prIds;
};

const buildCommentFacts = async (args: string[]): Promise<void> => {
  const searchQuery = args[0];
  const destFolder = args[1] || path.join(process.cwd(), 'data', 'comments');

  await Promise.all((await searchPullRequestsByText([searchQuery]) || []).map(async prId => {

    let fileContent = '';

    const prData = await fetchPullRequest(prId);

    fileContent += `### ${prData.title}\n\n`;
    fileContent += `link to pr ${prData.links.self.href}\n`;
    fileContent += `author: ${prData.author.display_name}\n`;
    fileContent += `reviewers: ${prData.reviewers.map(reviewer => reviewer.display_name).join(',')}\n`;
    fileContent += `creation date: ${prData.created_on}\n`;
    fileContent += `merge date: ${prData.state === 'MERGED' ? prData.updated_on : 'not yet merged'}\n`;
    fileContent += `\n`;
    fileContent += `## description\n\n`;
    fileContent += `${prData.description}\n\n`;
    fileContent += `## comments\n\n`;

    const commentsData = await fetchPullRequestComments([prId]);
    commentsData.forEach(commentData => {

      fileContent += `- comment id: ${commentData.id}\n`;
      fileContent += `  - author: ${commentData.user.display_name}\n`;
      fileContent += `  - date: ${commentData.created_on}\n`;
      if (commentData.parent) {
        fileContent += `  - parent comment id: ${commentData.parent.id}\n`;
      }
      fileContent += `  - comment: ${commentData.content.html}\n`;
    });

    fileContent += `\n`;

    const diff = await fetchPullRequestDiff(prId);

    fileContent += `## diff\n\n`;
    fileContent += `\`\`\`diff\n`
    fileContent += diff;
    fileContent += `\`\`\``

    const prCommentsFile = `${destFolder}/pr-${prId}.md`;
    console.log(`Writing comments to ${prCommentsFile}`);
    fs.mkdirSync(destFolder, { recursive: true });
    fs.writeFileSync(prCommentsFile, fileContent, { flag: 'w' });
  }));

};

async function main(args: string[] = process.argv.slice(2)) {

  try {

    let command = args[0];

    if (command === 'comments') {
      return await fetchPullRequestComments(args.slice(1));
    }

    if (command === 'search') {
      return await searchPullRequestsByText(args.slice(1));
    }

    if (command === 'build-comment-facts') {
      await buildCommentFacts(args.slice(1));
    }

    // changesets-api to search for commits does not exist - at least not publicly

  } catch (error) {
    // @ts-ignore
    console.error('Error executing query:', error.message);
    process.exit(1);
  }
}

main();