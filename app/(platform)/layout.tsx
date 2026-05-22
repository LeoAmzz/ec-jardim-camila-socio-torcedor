import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { RightPanel } from "@/components/layout/RightPanel";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[220px] transition-all">
        <Header />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6 content-area">
          <div className="max-w-3xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <RightPanel />
      {/* Spacer for RightPanel on very large screens to not overlap main content */}
      <div className="hidden xl:block w-[280px]" />
    </div>
  );
}
