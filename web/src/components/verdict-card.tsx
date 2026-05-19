import { RiskScore } from "./risk-score";
import type { VerdictOutput } from "@/lib/schemas";

const REC_LABEL: Record<string, string> = {
  approve: "✓ Approved",
  request_changes: "⚠ Changes requested",
  needs_understanding_proof: "📋 Proof of understanding required",
};

export function VerdictCard({ verdict }: { verdict: VerdictOutput }) {
  return (
    <div
      style={{
        background: "var(--ct-gold-light, #fdf6e3)",
        border: "1px solid var(--ct-gold, #b5922c)",
        borderRadius: "10px",
        padding: "1.5rem",
        margin: "1.25rem 0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--ct-gold, #b5922c)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "0.375rem",
            }}
          >
            Court verdict
          </div>
          <div
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--ct-ink, #1a1a2e)",
            }}
          >
            {REC_LABEL[verdict.recommendation] ?? verdict.recommendation}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--ct-gold, #b5922c)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "0.5rem",
            }}
          >
            Risk score
          </div>
          <RiskScore value={verdict.risk_score} />
        </div>
      </div>
      <p
        style={{
          margin: 0,
          color: "#374151",
          fontStyle: "italic",
          lineHeight: 1.65,
          fontSize: "0.9375rem",
        }}
      >
        {verdict.summary}
      </p>
    </div>
  );
}