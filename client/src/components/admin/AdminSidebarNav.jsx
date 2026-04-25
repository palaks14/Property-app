import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  Home,
  LifeBuoy,
  LogOut,
  Settings,
  Users,
  X
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

const navItems = [
  { label: "Dashboard", to: "/admin", icon: Home },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Properties", to: "/admin/properties", icon: Building2 },
  { label: "Bookings", to: "/admin/bookings", icon: BarChart3 },
  { label: "Payments", to: "/admin/payments", icon: CreditCard },
  { label: "Reports", to: "/admin/reports", icon: FileBarChart2 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
  { label: "Maintenance Requests", to: "/admin/maintenance", icon: ClipboardList },
  { label: "Queries", to: "/admin/queries", icon: LifeBuoy }
];

function AdminSidebarNav({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_error) {}
    localStorage.clear();
    navigate("/");
  };

  const isActiveRoute = (to) => {
    if (to === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(to);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-indigo-200/20 bg-slate-950/95 px-5 py-6 text-slate-100 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-300">
                Property Rental
              </p>
              <h1 className="mt-1 text-xl font-semibold">Admin Console</h1>
            </div>
            <button
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-indigo-500/20 text-indigo-100 shadow-inner ring-1 ring-indigo-400/30"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <Icon
                    size={17}
                    className={`transition ${
                      active ? "text-indigo-300" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-400">Account</p>
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebarNav;
