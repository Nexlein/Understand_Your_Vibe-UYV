import { type NextRequest, NextResponse } from "next/server";
import { githubApp } from "@/lib/github/app";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { runTrial } from "@/lib/ai-service";
import { setCommitStatus } from "@/lib/github/status";
import { postTrialComment } from "@/lib/github/comment";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const event = request.headers.get("x-github-event") ?? "";
  const deliveryId = request.headers.get("x-github-delivery") ?? "";

  try {
    await githubApp.webhooks.verifyAndReceive({
      id: deliveryId,
      name: event as Parameters<typeof githubApp.webhooks.verifyAndReceive>[0]["name"],
      signature,
      payload: body,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

type PREventData = {
  installationId: number;
  accountLogin: string;
  accountType: string;
  repoFullName: string;
  prNumber: number;
  headSha: string;
  title: string;
  authorLogin: string;
};

async function handlePREvent(data: PREventData): Promise<void> {
  await db.installation.upsert({
    where: { installationId: data.installationId },
    update: {},
    create: {
      installationId: data.installationId,
      accountLogin: data.accountLogin,
      accountType: data.accountType,
    },
  });

  const pr = await db.pullRequest.upsert({
    where: {
      repoFullName_prNumber_headSha: {
        repoFullName: data.repoFullName,
        prNumber: data.prNumber,
        headSha: data.headSha,
      },
    },
    update: { status: "pending" },
    create: {
      repoFullName: data.repoFullName,
      prNumber: data.prNumber,
      headSha: data.headSha,
      title: data.title,
      authorLogin: data.authorLogin,
      status: "pending",
      installationId: data.installationId,
    },
  });

  // Set pending status immediately (fast path — GitHub expects response < 10s)
  await setCommitStatus({
    installationId: data.installationId,
    repoFullName: data.repoFullName,
    sha: data.headSha,
    state: "pending",
    description: "Code Tribunal: analyzing your PR...",
  });

  // Fire-and-forget: the slow AI work runs after we return to GitHub
  void runTrialFlow({
    prDbId: pr.id,
    installationId: data.installationId,
    repoFullName: data.repoFullName,
    prNumber: data.prNumber,
    headSha: data.headSha,
  });
}

type OctokitInstance = Awaited<ReturnType<typeof githubApp.getInstallationOctokit>>;

// ~25 000 tokens max for the diff — leaves plenty of room for system prompts + schemas
const MAX_DIFF_BYTES = 100_000;

function truncateDiff(diff: string): string {
  if (diff.length <= MAX_DIFF_BYTES) return diff;
  // Cut at the last complete line within the limit
  const cut = diff.lastIndexOf("\n", MAX_DIFF_BYTES);
  return diff.slice(0, cut > 0 ? cut : MAX_DIFF_BYTES) +
    "\n\n# ... diff truncated — showing first 100 KB out of a larger changeset\n";
}

async function fetchDiff(
  octokit: OctokitInstance,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  try {
    const res = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      { owner, repo, pull_number: prNumber, headers: { accept: "application/vnd.github.diff" } }
    );
    return truncateDiff(res.data as unknown as string);
  } catch (err: unknown) {
    if ((err as { status?: number }).status !== 406) throw err;
  }

  // Fallback for PRs > 300 files: reconstruct diff from files API
  const MAX_FILES = 100;
  type GHFile = { filename: string; status: string; patch?: string };
  const filesRes = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
    { owner, repo, pull_number: prNumber, per_page: MAX_FILES, page: 1 }
  );
  const files = filesRes.data as GHFile[];

  const parts: string[] = [
    `# Large PR — showing first ${MAX_FILES} files (original exceeds 300 files)\n\n`,
  ];
  let bytes = parts[0].length;

  for (const file of files) {
    const chunk =
      `diff --git a/${file.filename} b/${file.filename}\n` +
      `--- a/${file.filename}\n+++ b/${file.filename}\n` +
      (file.patch ?? "(binary or too large)\n") + "\n";

    if (bytes + chunk.length > MAX_DIFF_BYTES) {
      parts.push(`\n# ... truncated at 100 KB\n`);
      break;
    }
    parts.push(chunk);
    bytes += chunk.length;
  }

  return parts.join("");
}

async function runTrialFlow(params: {
  prDbId: number;
  installationId: number;
  repoFullName: string;
  prNumber: number;
  headSha: string;
}): Promise<void> {
  const { prDbId, installationId, repoFullName, prNumber, headSha } = params;

  try {
    const octokit = await githubApp.getInstallationOctokit(installationId);
    const [owner, repo] = repoFullName.split("/") as [string, string];

    const diff = await fetchDiff(octokit, owner, repo, prNumber);
    const language = detectLanguage(diff);

    const trial = await runTrial({ diff, repoFullName, prNumber, language });

    await db.trial.create({
      data: {
        headSha,
        defense: JSON.stringify(trial.defense),
        prosecution: JSON.stringify(trial.prosecution),
        questions: JSON.stringify(trial.questions),
        verdict: JSON.stringify(trial.verdict),
        diff,
        pullRequestId: prDbId,
      },
    });

    const session = await db.quizSession.create({
      data: { answers: "[]", pullRequestId: prDbId },
    });

    await db.pullRequest.update({
      where: { id: prDbId },
      data: { status: "awaiting_proof" },
    });

    const quizUrl = `${env.NEXT_PUBLIC_APP_URL}/quiz/${session.id}`;
    await postTrialComment({ installationId, repoFullName, prNumber, trial, quizUrl });

    console.log(
      `[trial] Done: PR #${prNumber} on ${repoFullName} (sha: ${headSha.slice(0, 7)})`
    );
  } catch (err) {
    console.error(`[trial] Failed for PR #${prNumber} on ${repoFullName}:`, err);
    await setCommitStatus({
      installationId,
      repoFullName,
      sha: headSha,
      state: "error",
      description: "Code Tribunal: analysis failed. Retry by re-pushing.",
    }).catch((e: unknown) => console.error("[trial] Failed to set error status:", e));
  }
}

function detectLanguage(diff: string): string {
  const extensions = new Set<string>();
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      const ext = line.split(".").pop()?.toLowerCase();
      if (ext) extensions.add(ext);
    }
  }
  if (extensions.has("c") || extensions.has("h")) return "c";
  if (extensions.has("cpp") || extensions.has("hpp") || extensions.has("cc")) return "cpp";
  if (extensions.has("ts") || extensions.has("tsx")) return "typescript";
  if (extensions.has("js") || extensions.has("jsx")) return "javascript";
  if (extensions.has("py")) return "python";
  if (extensions.has("rs")) return "rust";
  if (extensions.has("go")) return "go";
  return "unknown";
}

githubApp.webhooks.on("pull_request.opened", async ({ payload }) => {
  if (!payload.installation) return;
  await handlePREvent({
    installationId: payload.installation.id,
    accountLogin: payload.repository.owner.login,
    accountType: payload.repository.owner.type,
    repoFullName: payload.repository.full_name,
    prNumber: payload.pull_request.number,
    headSha: payload.pull_request.head.sha,
    title: payload.pull_request.title,
    authorLogin: payload.pull_request.user.login,
  });
});

githubApp.webhooks.on("pull_request.synchronize", async ({ payload }) => {
  if (!payload.installation) return;
  await handlePREvent({
    installationId: payload.installation.id,
    accountLogin: payload.repository.owner.login,
    accountType: payload.repository.owner.type,
    repoFullName: payload.repository.full_name,
    prNumber: payload.pull_request.number,
    headSha: payload.pull_request.head.sha,
    title: payload.pull_request.title,
    authorLogin: payload.pull_request.user?.login ?? "unknown",
  });
});

githubApp.webhooks.on("pull_request.closed", async ({ payload }) => {
  if (!payload.installation) return;

  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;
  const headSha = payload.pull_request.head.sha;
  const merged = payload.pull_request.merged ?? false;
  const newStatus = merged ? "merged" : "closed";

  try {
    const pr = await db.pullRequest.findFirst({
      where: { repoFullName, prNumber },
      orderBy: { createdAt: "desc" },
    });

    if (!pr) return;

    await db.pullRequest.update({
      where: { id: pr.id },
      data: { status: newStatus },
    });

    // Only update commit status if PR wasn't already approved
    if (pr.status !== "approved") {
      await setCommitStatus({
        installationId: payload.installation.id,
        repoFullName,
        sha: headSha,
        state: "failure",
        description: merged
          ? "Code Tribunal: merged without proof of understanding"
          : "Code Tribunal: PR closed — understanding not verified",
      });
    }

    console.log(`[webhook] PR #${prNumber} on ${repoFullName} marked as ${newStatus}`);
  } catch (err) {
    console.error(`[webhook] Failed to handle PR close for #${prNumber}:`, err);
  }
});
