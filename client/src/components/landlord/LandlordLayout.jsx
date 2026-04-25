import { useState } from "react";
import LandlordSidebarNav from "./LandlordSidebarNav";
import LandlordTopbar from "./LandlordTopbar";

function LandlordLayout({
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
      <LandlordSidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <LandlordTopbar
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

export default LandlordLayout;
