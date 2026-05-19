import { githubApp } from "@/lib/github/app";

type StatusState = "pending" | "success" | "failure" | "error";

export async function setCommitStatus(params: {
  installationId: number;
  repoFullName: string;
  sha: string;
  state: StatusState;
  description: string;
  targetUrl?: string;
}): Promise<void> {
  const octokit = await githubApp.getInstallationOctokit(params.installationId);
  const [owner, repo] = params.repoFullName.split("/") as [string, string];

  await octokit.request("POST /repos/{owner}/{repo}/statuses/{sha}", {
    owner,
    repo,
    sha: params.sha,
    state: params.state,
    context: "code-tribunal/understanding",
    description: params.description.slice(0, 140),
    ...(params.targetUrl ? { target_url: params.targetUrl } : {}),
  });
}
