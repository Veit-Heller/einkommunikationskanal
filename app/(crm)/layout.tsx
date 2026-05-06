import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
        {/* Sidebar — desktop only */}
        <Sidebar />
        {/* Main content — bottom padding on mobile for BottomNav */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      {/* Bottom navigation — mobile only */}
      <BottomNav />
    </ThemeProvider>
  );
}
