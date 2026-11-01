import "./globals.css";

export const metadata = {
  title: "ResearchForge – Autonomous Research Workspace",
  description: "Agentic AI-powered research platform with LangGraph orchestration and multi-agent synthesis.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

