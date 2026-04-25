import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import TenantLayout from "../components/tenant/TenantLayout";

function TenantNotifications() {
  const [search, setSearch] = useState("");
  const notifications = useMemo(
    () => [
      { id: 1, title: "Booking confirmed", description: "Your booking for Green Park Residency is now active.", time: "2h ago" },
      { id: 2, title: "Payment reminder", description: "Rent payment due in 3 days for April 2026.", time: "1d ago" },
      { id: 3, title: "Support update", description: "Admin replied to your maintenance query.", time: "2d ago" }
    ],
    []
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return notifications;
    return notifications.filter((item) =>
      [item.title, item.description].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [notifications, search]);

  return (
    <TenantLayout
      title="Notifications"
      subtitle="Stay updated on bookings, payments, and support activity."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search notifications..."
    >
      <section className="saas-panel">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No matching notifications.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <article key={item.id} className="saas-interactive-card rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-sky-600">
                    <Bell size={15} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                    <p className="mt-2 text-xs text-slate-400">{item.time}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </TenantLayout>
  );
}

export default TenantNotifications;
