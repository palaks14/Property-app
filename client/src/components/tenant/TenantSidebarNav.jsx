import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  CreditCard,
  HelpCircle,
  Home,
  Wrench,
  LogOut,
  Search,
  UserCircle2,
  CalendarDays,
  X
} from "lucide-react";

const navItems = [
  { label: "Home", to: "/tenant", icon: Home },
  { label: "Browse Properties", to: "/tenant/browse", icon: Search },
  { label: "My Bookings", to: "/tenant/bookings", icon: CalendarDays },
  { label: "Payments", to: "/tenant/payments", icon: CreditCard },
  { label: "Maintenance", to: "/tenant/maintenance", icon: Wrench },
  { label: "Profile", to: "/tenant/profile", icon: UserCircle2 },
  { label: "Support", to: "/tenant/support", icon: HelpCircle },
  { label: "Notifications", to: "/tenant/notifications", icon: Bell }
];

function TenantSidebarNav({ isOpen, onClose }) {
  const navigate = useNavigate();
  const tenantName = useMemo(() => localStorage.getItem("tenant_name") || "Tenant", []);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200/15 bg-slate-950/95 px-5 py-6 text-slate-100 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Property Rental</p>
            <h1 className="mt-1 text-xl font-semibold">Tenant Space</h1>
            <p className="mt-2 text-xs text-slate-400">{tenantName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                end={item.to === "/tenant"}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/30"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`
                }
              >
                <Icon size={17} className="text-slate-400 transition-colors group-hover:text-slate-100" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-slate-800 pt-5">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-rose-500 active:scale-[0.98]"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default TenantSidebarNav;
