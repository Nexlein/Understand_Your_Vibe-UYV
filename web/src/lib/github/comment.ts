import { githubApp } from "@/lib/github/app";
import type { EvaluateResponse, TrialResponse } from "@/lib/schemas";

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

export async function postQuizResultComment(params: {
  installationId: number;
  repoFullName: string;
  prNumber: number;
  authorLogin: string;
  evaluation: EvaluateResponse;
}): Promise<void> {
  const octokit = await githubApp.getInstallationOctokit(params.installationId);
  const [owner, repo] = params.repoFullName.split("/") as [string, string];
  const { evaluation } = params;

  const scoreBar =
    "█".repeat(Math.round(evaluation.understanding_score / 10)) +
    "░".repeat(10 - Math.round(evaluation.understanding_score / 10));

  const perQuestionLines = evaluation.per_question
    .map((q) => {
      const missing =
        q.missing_concepts.length > 0
          ? `\n  > Concepts manquants : ${q.missing_concepts.join(", ")}`
          : "";
      return `- **Q${q.question_id}** — ${q.score}/100 : ${q.feedback}${missing}`;
    })
    .join("\n");

  const verdict = evaluation.passed
    ? "✅ **Merge débloqué** — le développeur a prouvé sa compréhension du code."
    : "❌ **Merge bloqué** — score insuffisant (70/100 requis).";

  const body = `## 📋 Code Tribunal — Résultat du Quiz

**Développeur :** @${params.authorLogin}
**Score :** \`${evaluation.understanding_score}/100\` ${scoreBar}

${verdict}

<details>
<summary>Détail par question</summary>

${perQuestionLines}

</details>`;

  await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner,
    repo,
    issue_number: params.prNumber,
    body,
  });
}
