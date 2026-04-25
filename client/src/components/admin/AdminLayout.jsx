import { useState } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminTopbar from "./AdminTopbar";

function AdminLayout({
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
      <AdminSidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <AdminTopbar
          title={title}
          subtitle={subtitle}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          onOpenMenu={() => setSidebarOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
