import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

function AdminTopbar({
  title,
  subtitle,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  onOpenMenu
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const adminName = useMemo(() => localStorage.getItem("admin_name") || "Admin", []);
  const dropdownRef = useRef(null);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_error) {}
    localStorage.clear();
    setOpen(false);
    navigate("/");
  };

  useEffect(() => {
    const handler = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-3">
        <button
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
          onClick={onOpenMenu}
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-[180px] flex-1">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>

        <label className="relative order-3 w-full sm:order-none sm:min-w-[220px] sm:flex-1 sm:max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="saas-control w-full rounded-xl py-2.5 pl-9 pr-3"
          />
        </label>

        <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-slate-50"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {adminName.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden text-slate-700 sm:block">{adminName}</span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                Profile Settings
              </button>
              <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                Notification Prefs
              </button>
              <button
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
