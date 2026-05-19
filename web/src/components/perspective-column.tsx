import type { DefenseOutput, ProsecutionOutput } from "@/lib/schemas";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#b91c1c",
  high: "#d97706",
  medium: "#b45309",
  low: "#15803d",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "🔴 Critical",
  high: "🟠 High",
  medium: "🟡 Medium",
  low: "🟢 Low",
};

type DefenseProps = { variant: "defense" } & DefenseOutput;
type ProsecutionProps = { variant: "prosecution" } & ProsecutionOutput;
type Props = DefenseProps | ProsecutionProps;

export function PerspectiveColumn(props: Props) {
  const isDefense = props.variant === "defense";
  const borderColor = isDefense ? "#6b82c2" : "#c26b6b";
  const bgColor = isDefense
    ? "var(--ct-navy-light, #eaf0f8)"
    : "var(--ct-bordeaux-light, #f8eaec)";
  const titleColor = isDefense
    ? "var(--ct-navy, #1e3a5f)"
    : "var(--ct-bordeaux, #7a1e32)";
  const badge = isDefense ? "🛡️ Defense" : "⚔️ Prosecution";

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "10px",
        padding: "1.25rem",
      }}
    >
      <h3
        style={{
          color: titleColor,
          marginTop: 0,
          marginBottom: "0.875rem",
        }}
      >
        {badge}
      </h3>

      {isDefense ? (
        <>
          <p
            style={{
              fontStyle: "italic",
              color: "#374151",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            {props.design_intent}
          </p>
          {props.strengths.map((s, i) => (
            <div key={i} style={{ marginBottom: "0.875rem" }}>
              <strong style={{ color: titleColor, fontSize: "0.9rem" }}>{s.title}</strong>
              <p
                style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#374151", lineHeight: 1.55 }}
              >
                {s.explanation}
              </p>
              {s.line_references.length > 0 && (
                <code style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginTop: "0.2rem" }}>
                  {s.line_references.join(" · ")}
                </code>
              )}
            </div>
          ))}
          <p
            style={{
              margin: "1rem 0 0",
              fontStyle: "italic",
              fontSize: "0.85rem",
              color: "#374151",
              borderTop: `1px solid ${borderColor}`,
              paddingTop: "0.75rem",
              lineHeight: 1.6,
            }}
          >
            {props.defense_summary}
          </p>
        </>
      ) : (
        <>
          {props.concerns.map((c, i) => (
            <div key={i} style={{ marginBottom: "0.875rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "0.2rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: SEVERITY_COLOR[c.severity] ?? "#374151",
                    background: "rgba(255,255,255,0.65)",
                    padding: "1px 7px",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {SEVERITY_LABEL[c.severity] ?? c.severity.toUpperCase()}
                </span>
                <strong style={{ color: titleColor, fontSize: "0.9rem" }}>{c.title}</strong>
              </div>
              <p
                style={{ margin: 0, fontSize: "0.85rem", color: "#374151", lineHeight: 1.55 }}
              >
                {c.explanation}
              </p>
              {c.line_references.length > 0 && (
                <code style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginTop: "0.2rem" }}>
                  {c.line_references.join(" · ")}
                </code>
              )}
            </div>
          ))}
          {props.attack_vectors.length > 0 && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color: "#6b7280",
                borderTop: `1px solid ${borderColor}`,
                paddingTop: "0.6rem",
              }}
            >
              <strong>Attack vectors:</strong> {props.attack_vectors.join(", ")}
            </div>
          )}
          <p
            style={{
              margin: "0.75rem 0 0",
              fontStyle: "italic",
              fontSize: "0.85rem",
              color: "#374151",
              borderTop: `1px solid ${borderColor}`,
              paddingTop: "0.75rem",
              lineHeight: 1.6,
            }}
          >
            {props.prosecution_summary}
          </p>
        </>
      )}
    </div>
  );
}