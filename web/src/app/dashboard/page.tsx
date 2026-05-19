import Link from "next/link";
import { db } from "@/lib/db";
import { VerdictOutputSchema } from "@/lib/schemas";
import { RiskScore } from "@/components/risk-score";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#e8e2d5", color: "#6b5a2a", label: "En attente" },
  awaiting_proof: { bg: "#fef9c3", color: "#854d0e", label: "Quiz requis" },
  approved: { bg: "#dcfce7", color: "#166534", label: "Approuvé ✓" },
  rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejeté" },
  closed: { bg: "#f3f4f6", color: "#6b7280", label: "Fermée" },
  merged: { bg: "#ede9fe", color: "#6d28d9", label: "Mergée" },
};

export default async function DashboardPage() {
  const pullRequests = await db.pullRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      trials: { orderBy: { createdAt: "desc" }, take: 1 },
      quizSessions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const total = pullRequests.length;
  const approved = pullRequests.filter((p) => p.status === "approved").length;
  const pending = pullRequests.filter(
    (p) => p.status === "pending" || p.status === "awaiting_proof"
  ).length;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Dashboard</h1>
      <p style={{ color: "var(--ct-muted)", marginBottom: "2rem", fontSize: "0.9375rem" }}>
        Toutes les PRs analysées par Code Tribunal
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard label="PRs analysées" value={total} color="var(--ct-navy)" />
        <StatCard label="Approuvées" value={approved} color="#15803d" />
        <StatCard label="En cours" value={pending} color="#d97706" />
      </div>

      {/* PR list */}
      {pullRequests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            background: "#fff",
            border: "1px solid #e2d9c8",
            borderRadius: "10px",
            color: "var(--ct-muted)",
          }}
        >
          <p style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>⚖️</p>
          <p>Aucune PR analysée pour le moment.</p>
          <p style={{ fontSize: "0.875rem" }}>
            Installe l&apos;app GitHub et ouvre une PR pour commencer.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {pullRequests.map((pr) => {
            const trial = pr.trials[0];
            const session = pr.quizSessions[0];
            const statusStyle = STATUS_STYLE[pr.status] ?? STATUS_STYLE.pending;

            let riskScore: number | null = null;
            if (trial) {
              try {
                const verdict = VerdictOutputSchema.parse(JSON.parse(trial.verdict));
                riskScore = verdict.risk_score;
              } catch {
                /* ignore malformed data */
              }
            }

            return (
              <div
                key={pr.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2d9c8",
                  borderRadius: "10px",
                  padding: "1.125rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  flexWrap: "wrap",
                }}
              >
                {/* Status badge */}
                <span
                  className="ct-badge"
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    flexShrink: 0,
                  }}
                >
                  {statusStyle.label}
                </span>

                {/* PR info */}
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--ct-ink)",
                      fontSize: "0.9375rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {pr.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ct-muted)" }}>
                    {pr.repoFullName} · PR #{pr.prNumber} · @{pr.authorLogin}
                  </div>
                </div>

                {/* Risk score */}
                {riskScore !== null && (
                  <div style={{ flexShrink: 0 }}>
                    <RiskScore value={riskScore} size="sm" />
                  </div>
                )}

                {/* Quiz score */}
                {session?.understandScore != null && (
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: "0.8rem",
                      color: session.passed ? "#15803d" : "#b91c1c",
                      fontWeight: 600,
                    }}
                  >
                    Quiz : {session.understandScore}/100
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {session && (
                    <Link
                      href={`/quiz/${session.id}`}
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--ct-navy)",
                        textDecoration: "none",
                        border: "1px solid var(--ct-navy)",
                        padding: "3px 10px",
                        borderRadius: "5px",
                        fontWeight: 600,
                      }}
                    >
                      Voir quiz
                    </Link>
                  )}
                  <a
                    href={`https://github.com/${pr.repoFullName}/pull/${pr.prNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--ct-muted)",
                      textDecoration: "none",
                      border: "1px solid #e2d9c8",
                      padding: "3px 10px",
                      borderRadius: "5px",
                    }}
                  >
                    GitHub ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2d9c8",
        borderRadius: "10px",
        padding: "1.25rem 1.5rem",
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--ct-muted)", marginTop: "0.375rem" }}>
        {label}
      </div>
    </div>
  );
}
