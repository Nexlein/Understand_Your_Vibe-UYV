"use client";

type DiffFile = {
  header: string;
  filename: string;
  lines: { type: "added" | "removed" | "context" | "hunk" | "header"; text: string }[];
};

function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("diff --git ") || line.startsWith("# Large PR")) {
      if (current) files.push(current);
      const match = line.match(/\+\+\+ b\/(.+)/) ?? line.match(/diff --git a\/.+ b\/(.+)/);
      current = {
        header: line,
        filename: match?.[1] ?? line,
        lines: [],
      };
    } else if (current) {
      if (line.startsWith("@@")) {
        current.lines.push({ type: "hunk", text: line });
      } else if (line.startsWith("+++ ") || line.startsWith("--- ") || line.startsWith("index ") || line.startsWith("new file") || line.startsWith("deleted file")) {
        const filenameMatch = line.match(/\+\+\+ b\/(.+)/);
        if (filenameMatch) current.filename = filenameMatch[1];
        current.lines.push({ type: "header", text: line });
      } else if (line.startsWith("+")) {
        current.lines.push({ type: "added", text: line });
      } else if (line.startsWith("-")) {
        current.lines.push({ type: "removed", text: line });
      } else {
        current.lines.push({ type: "context", text: line });
      }
    }
  }
  if (current) files.push(current);
  return files;
}

const LINE_STYLE: Record<string, React.CSSProperties> = {
  added: { background: "#d1fae5", color: "#065f46" },
  removed: { background: "#fee2e2", color: "#991b1b" },
  hunk: { background: "#dbeafe", color: "#1e40af", fontWeight: 600 },
  header: { background: "#f3f4f6", color: "#6b7280" },
  context: {},
};

export function DiffViewer({ diff, prUrl }: { diff: string; prUrl: string }) {
  if (!diff) return null;
  const files = parseDiff(diff);
  const truncated = diff.includes("truncated");

  return (
    <div style={{ marginTop: "2rem" }}>
      <details>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--ct-ink)",
            padding: "0.75rem 1rem",
            background: "#f5f0e8",
            border: "1px solid #e2d9c8",
            borderRadius: "8px",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>📄</span>
          <span>
            Code analysé — {files.length} fichier{files.length > 1 ? "s" : ""}
            {truncated && " (tronqué à 100 KB)"}
          </span>
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: "auto",
              fontSize: "0.8rem",
              color: "var(--ct-navy)",
              textDecoration: "none",
              border: "1px solid var(--ct-navy)",
              padding: "2px 10px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            Voir sur GitHub ↗
          </a>
        </summary>

        <div
          style={{
            marginTop: "0.5rem",
            border: "1px solid #e2d9c8",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {files.map((file, fi) => (
            <details key={fi} open={fi === 0}>
              <summary
                style={{
                  cursor: "pointer",
                  padding: "0.5rem 1rem",
                  background: "#1a1a2e",
                  color: "#d1b96a",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderBottom: "1px solid #2d2d4a",
                  listStyle: "none",
                }}
              >
                📄 {file.filename}
              </summary>
              <pre
                style={{
                  margin: 0,
                  overflowX: "auto",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  background: "#fafafa",
                }}
              >
                {file.lines.map((line, li) => (
                  <div
                    key={li}
                    style={{
                      padding: "0 1rem",
                      whiteSpace: "pre",
                      ...LINE_STYLE[line.type],
                    }}
                  >
                    {line.text || " "}
                  </div>
                ))}
              </pre>
            </details>
          ))}
        </div>
      </details>
    </div>
  );
}
