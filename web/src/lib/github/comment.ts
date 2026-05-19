import { githubApp } from "@/lib/github/app";
import type { TrialResponse } from "@/lib/schemas";

export async function postTrialComment(params: {
  installationId: number;
  repoFullName: string;
  prNumber: number;
  trial: TrialResponse;
  quizUrl: string;
}): Promise<void> {
  const octokit = await githubApp.getInstallationOctokit(params.installationId);
  const [owner, repo] = params.repoFullName.split("/") as [string, string];
  const { defense, prosecution, verdict } = params.trial;

  const severityEmoji: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
  };

  const defenseLines = defense.strengths
    .map((s) => `- **${s.title}** — ${s.explanation}`)
    .join("\n");

  const prosecutionLines = prosecution.concerns
    .map(
      (c) =>
        `- ${severityEmoji[c.severity] ?? "•"} **[${c.severity.toUpperCase()}]** **${c.title}** — ${c.explanation}`
    )
    .join("\n");

  const riskFill = Math.round(verdict.risk_score);
  const riskBar = "█".repeat(riskFill) + "░".repeat(10 - riskFill);

  const body = `## ⚖️ Code Tribunal — Trial Result

> ${verdict.summary}

**Risk Score:** \`${verdict.risk_score}/10\` ${riskBar}
**Recommendation:** \`${verdict.recommendation}\`

<details>
<summary>🛡️ Defense — ${defense.strengths.length} strength(s)</summary>

${defense.design_intent}

${defenseLines}

*${defense.defense_summary}*
</details>

<details>
<summary>⚔️ Prosecution — ${prosecution.concerns.length} concern(s)</summary>

${prosecutionLines}

**Attack vectors:** ${prosecution.attack_vectors.join(", ")}

*${prosecution.prosecution_summary}*
</details>

---

### 📋 Prove Your Understanding

To unlock the merge button, answer **${params.trial.questions.items.length} questions** about this code.

**[→ Take the Quiz](${params.quizUrl})**

*This PR will remain blocked until you score ≥ 70/100.*`;

  await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner,
    repo,
    issue_number: params.prNumber,
    body,
  });
}
