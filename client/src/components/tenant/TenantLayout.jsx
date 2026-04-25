import { useState } from "react";
import TenantSidebarNav from "./TenantSidebarNav";
import TenantTopbar from "./TenantTopbar";

function TenantLayout({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <TenantSidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <TenantTopbar
          title={title}
          subtitle={subtitle}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          onOpenMenu={() => setSidebarOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:space-y-6 sm:p-6 lg:space-y-7 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default TenantLayout;
