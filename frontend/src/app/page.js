export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          ResearchForge
        </h1>
        <p className="text-lg text-muted-foreground">
          Autonomous Research Workspace powered by multi-agent LangGraph orchestration and MCP.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <a
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Get Started
          </a>
          <a
            href="/dashboard"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

