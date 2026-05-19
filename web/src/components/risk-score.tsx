type Props = { value: number; size?: "sm" | "md" };

export function RiskScore({ value, size = "md" }: Props) {
  const filled = Math.round(Math.min(10, Math.max(0, value)));
  const color = value >= 7 ? "#b91c1c" : value >= 4 ? "#d97706" : "#15803d";
  const blockW = size === "sm" ? "14px" : "18px";
  const blockH = size === "sm" ? "8px" : "11px";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: blockW,
            height: blockH,
            borderRadius: "2px",
            background: i < filled ? color : "#d1c9bb",
          }}
        />
      ))}
      <span
        style={{
          marginLeft: "10px",
          fontWeight: 700,
          color,
          fontSize: size === "sm" ? "0.875rem" : "1rem",
        }}
      >
        {value}/10
      </span>
    </div>
  );
}
