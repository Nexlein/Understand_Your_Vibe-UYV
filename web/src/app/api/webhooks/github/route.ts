import { type NextRequest, NextResponse } from "next/server";
import { githubApp } from "@/lib/github/app";
import { db } from "@/lib/db";

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

githubApp.webhooks.on("pull_request.opened", async ({ payload }) => {
  const installation = payload.installation;
  if (!installation) return;

  await db.installation.upsert({
    where: { installationId: installation.id },
    update: {},
    create: {
      installationId: installation.id,
      accountLogin: payload.repository.owner.login,
      accountType: payload.repository.owner.type,
    },
  });

  const pr = await db.pullRequest.upsert({
    where: {
      repoFullName_prNumber_headSha: {
        repoFullName: payload.repository.full_name,
        prNumber: payload.pull_request.number,
        headSha: payload.pull_request.head.sha,
      },
    },
    update: {},
    create: {
      repoFullName: payload.repository.full_name,
      prNumber: payload.pull_request.number,
      headSha: payload.pull_request.head.sha,
      title: payload.pull_request.title,
      authorLogin: payload.pull_request.user.login,
      status: "pending",
      installationId: installation.id,
    },
  });

  console.log(
    `[webhook] PR opened: #${pr.prNumber} on ${pr.repoFullName} (sha: ${pr.headSha.slice(0, 7)})`
  );
});

githubApp.webhooks.on("pull_request.synchronize", async ({ payload }) => {
  const installation = payload.installation;
  if (!installation) return;

  await db.pullRequest.upsert({
    where: {
      repoFullName_prNumber_headSha: {
        repoFullName: payload.repository.full_name,
        prNumber: payload.pull_request.number,
        headSha: payload.pull_request.head.sha,
      },
    },
    update: { status: "pending" },
    create: {
      repoFullName: payload.repository.full_name,
      prNumber: payload.pull_request.number,
      headSha: payload.pull_request.head.sha,
      title: payload.pull_request.title,
      authorLogin: payload.pull_request.user?.login ?? "unknown",
      status: "pending",
      installationId: installation.id,
    },
  });

  console.log(
    `[webhook] PR synchronized: #${payload.pull_request.number} on ${payload.repository.full_name} — new sha: ${payload.pull_request.head.sha.slice(0, 7)}`
  );
});
