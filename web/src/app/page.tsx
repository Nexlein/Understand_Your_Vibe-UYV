const INSTALL_URL = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ?? "#";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section
        style={{
          background: "#1a1a2e",
          padding: "5rem 2rem 4.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p
            style={{
              color: "#b5922c",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: "1.25rem",
            }}
          >
            GitHub App · Code Review · Preuve de compréhension
          </p>
          <h1
            style={{
              color: "#f5f0e8",
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              lineHeight: 1.18,
              margin: "0 0 1.5rem",
              fontWeight: 900,
            }}
          >
            Every AI-generated PR<br />deserves a fair trial.
          </h1>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "1.125rem",
              lineHeight: 1.75,
              marginBottom: "2.5rem",
            }}
          >
            Defense argues its merits. Prosecution exposes its risks.
            <br />
            The developer renders the final verdict —{" "}
            <em style={{ color: "#d1b96a" }}>after proving they understand the code.</em>
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href={INSTALL_URL} className="ct-btn" style={{ fontSize: "1rem" }}>
              Install on GitHub →
            </a>
            <a href="/dashboard" className="ct-btn-outline" style={{ fontSize: "1rem" }}>
              Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "var(--ct-cream)", padding: "4rem 2rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              color: "var(--ct-ink)",
              marginBottom: "0.5rem",
              fontSize: "1.75rem",
            }}
          >
            Comment ça marche
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--ct-muted)",
              marginBottom: "3rem",
              fontSize: "0.9375rem",
            }}
          >
            Chaque PR passe par trois agents IA avant que le merge ne soit débloqué.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {STEPS.map((step) => (
              <div
                key={step.num}
                style={{
                  background: "#fff",
                  border: "1px solid #e2d9c8",
                  borderRadius: "10px",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#1a1a2e",
                    color: "#b5922c",
                    fontWeight: 700,
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    margin: "0 0 0.5rem",
                    fontSize: "1rem",
                    color: "var(--ct-ink)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{ margin: 0, fontSize: "0.875rem", color: "var(--ct-muted)", lineHeight: 1.65 }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section style={{ background: "#1a1a2e", padding: "4rem 2rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              color: "#f5f0e8",
              marginBottom: "2.5rem",
              fontSize: "1.75rem",
            }}
          >
            Les 5 agents du tribunal
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
            {AGENTS.map((a) => (
              <div
                key={a.name}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid #2d2d4a",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{a.icon}</div>
                <div style={{ color: "#b5922c", fontWeight: 700, fontSize: "0.875rem" }}>
                  {a.name}
                </div>
                <div style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                  {a.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Punchline */}
      <section style={{ background: "var(--ct-cream)", padding: "4rem 2rem", textAlign: "center" }}>
        <blockquote
          style={{
            maxWidth: "680px",
            margin: "0 auto",
            borderLeft: "4px solid #b5922c",
            paddingLeft: "1.5rem",
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontSize: "1.25rem",
              fontStyle: "italic",
              color: "var(--ct-ink)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            "Vous pouvez <code style={{ fontStyle: "normal", background: "#e8e2d5", padding: "0 4px", borderRadius: "3px" }}>git push</code> tout ce que vous voulez.
            Vous ne shippez que ce que vous <strong>comprenez</strong>."
          </p>
        </blockquote>
      </section>

      <footer
        style={{
          background: "#1a1a2e",
          borderTop: "1px solid #2d2d4a",
          padding: "1.5rem 2rem",
          textAlign: "center",
          color: "#4b5563",
          fontSize: "0.8rem",
        }}
      >
        Code Tribunal — Hackathon 2026
      </footer>
    </>
  );
}

const STEPS = [
  {
    num: "1",
    title: "PR ouverte",
    desc: "Un webhook GitHub détecte l'ouverture de la PR. Le diff est récupéré et envoyé aux agents IA.",
  },
  {
    num: "2",
    title: "Le Procès",
    desc: "Défense, Accusation et Interrogateur analysent le code en parallèle. Le Juge synthétise un verdict.",
  },
  {
    num: "3",
    title: "Status check pending",
    desc: "Un commentaire structuré est posté sur la PR avec un lien vers le quiz. Le merge est bloqué.",
  },
  {
    num: "4",
    title: "Le Quiz",
    desc: "Le développeur lit les deux perspectives et répond à 3 questions techniques sur son code.",
  },
  {
    num: "5",
    title: "Verdict final",
    desc: "Si le score est ≥ 70/100, le status check passe au vert. Le merge est débloqué.",
  },
];

const AGENTS = [
  { icon: "🛡️", name: "Defense", role: "Argumente les mérites du code" },
  { icon: "⚔️", name: "Prosecution", role: "Expose les risques et vulnérabilités" },
  { icon: "❓", name: "Interrogator", role: "Génère 3 questions ciblées" },
  { icon: "⚖️", name: "Judge", role: "Synthétise le verdict" },
  { icon: "📊", name: "Evaluator", role: "Note les réponses du développeur" },
];
