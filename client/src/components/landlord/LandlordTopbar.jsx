import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFullProfile } from "../../services/profileService";
import { getSessionUser } from "../../utils/sessionUser";

function LandlordTopbar({
  title,
  subtitle,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  onOpenMenu
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [landlordName, setLandlordName] = useState(localStorage.getItem("landlord_name") || "Landlord");
  const [landlordEmail, setLandlordEmail] = useState("");

  useEffect(() => {
    const handler = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let active = true;
    const session = getSessionUser();

    const loadProfile = async () => {
      if (!session.id) return;
      try {
        const profile = await getFullProfile(session.id);
        if (!active || !profile) return;
        const resolvedName = profile.name || localStorage.getItem("landlord_name") || "Landlord";
        setLandlordName(resolvedName);
        setLandlordEmail(profile.email || "");
        localStorage.setItem("landlord_name", resolvedName);
      } catch (_error) {}
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-3">
        <button
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] lg:hidden"
          onClick={onOpenMenu}
          aria-label="Open landlord menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-[180px] flex-1">
          <h2 className="text-lg font-semibold leading-tight text-slate-900 sm:text-xl">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>

        <label className="relative order-3 w-full sm:order-none sm:min-w-[230px] sm:flex-1 sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="saas-control w-full rounded-xl py-2.5 pl-9 pr-3"
          />
        </label>

        <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-500" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {landlordName.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-slate-700">{landlordName}</span>
              {landlordEmail ? <span className="block text-xs text-slate-400">{landlordEmail}</span> : null}
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                Host Profile
              </button>
              <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default LandlordTopbar;
