import "./globals.css";
import { Providers } from "../components/Providers";

export const metadata = {
  title: "ResearchForge – Autonomous Workspace",
  description: "Autonomous Agentic Research Workspace with Multi-Agent Synthesis, Knowledge Graph, and Verifiable Claims.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-surface-container-low font-body-md text-on-surface antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
