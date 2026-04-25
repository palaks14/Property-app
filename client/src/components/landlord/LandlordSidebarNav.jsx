import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CircleUserRound,
  Home,
  LogOut,
  PlusSquare,
  Wrench,
  Wallet,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getFullProfile } from "../../services/profileService";
import { getSessionUser } from "../../utils/sessionUser";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: Home, end: true },
  { label: "Properties", to: "/dashboard/properties", icon: Building2 },
  { label: "Add Property", to: "/dashboard/add-property", icon: PlusSquare },
  { label: "Bookings", to: "/dashboard/bookings", icon: BarChart3 },
  { label: "Maintenance", to: "/dashboard/maintenance", icon: Wrench },
  { label: "Earnings", to: "/dashboard/earnings", icon: Wallet },
  { label: "Profile", to: "/dashboard/profile", icon: CircleUserRound }
];

function LandlordSidebarNav({ isOpen, onClose }) {
  const navigate = useNavigate();
  const landlordName = useMemo(() => localStorage.getItem("landlord_name") || "Landlord", []);
  const [profilePreview, setProfilePreview] = useState(null);
  const [loadingProfilePreview, setLoadingProfilePreview] = useState(true);

  useEffect(() => {
    let active = true;
    const session = getSessionUser();

    const loadProfile = async () => {
      if (!session.id) {
        setLoadingProfilePreview(false);
        return;
      }

      try {
        const profile = await getFullProfile(session.id);
        if (active) {
          setProfilePreview(profile);
          if (profile?.name) {
            localStorage.setItem("landlord_name", profile.name);
          }
        }
      } catch (error) {
        console.error("Sidebar profile preview load failed", error);
      } finally {
        if (active) setLoadingProfilePreview(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-indigo-200/20 bg-slate-950/95 px-5 py-6 text-slate-100 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-indigo-300">Property Rental</p>
            <h1 className="mt-1 text-xl font-semibold">Host Workspace</h1>
            <p className="mt-2 text-xs text-slate-400">{profilePreview?.name || landlordName}</p>
            {profilePreview?.email ? <p className="mt-1 text-[11px] text-slate-500">{profilePreview.email}</p> : null}
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
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-400/30"
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

export default LandlordSidebarNav;
