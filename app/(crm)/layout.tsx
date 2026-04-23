import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
