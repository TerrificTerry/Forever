import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pt-16 md:ml-[270px] md:pt-0">
        <div className="mx-auto min-h-screen max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">{children}</div>
      </main>
    </div>
  );
}
