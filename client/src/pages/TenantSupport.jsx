import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TenantLayout from "../components/tenant/TenantLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";

function TenantSupport() {
  const [query, setQuery] = useState("");
  const [queryList, setQueryList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/query");
      setQueryList(response.data || []);
    } catch (error) {
      console.error("Support query fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const sendQuery = async () => {
    try {
      await axios.post("/api/query", { message: query });
      alert("Query sent");
      setQuery("");
      await fetchQueries();
    } catch {
      alert("Error sending query");
    }
  };

  const filteredQueries = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return queryList;
    return queryList.filter((item) =>
      [item.message, item.reply, item.status].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [queryList, search]);

  return (
    <TenantLayout
      title="Support Center"
      subtitle="Need help? Contact admin and track your support tickets."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search support tickets..."
    >
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="saas-panel lg:col-span-2">
          <h3 className="saas-panel-title">Raise a Support Request</h3>
          <p className="saas-panel-subtitle mb-4">Describe your issue and our team will reply here.</p>
          <textarea
            rows={4}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Write your message..."
            className="saas-control w-full p-2.5"
          />
          <button
            onClick={sendQuery}
            className="saas-button-primary mt-3"
          >
            Submit Query
          </button>
        </article>

        <article className="saas-panel">
          <h3 className="saas-panel-title">Quick Help</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Contact admin for payment issues.</li>
            <li>Use booking page to check active rentals.</li>
            <li>Update profile details for accurate communication.</li>
          </ul>
        </article>
      </section>

      <section className="saas-panel">
        <h3 className="saas-panel-title">Support History</h3>
        <p className="saas-panel-subtitle mb-4">Recent tickets with admin replies and status updates.</p>
        {loading ? (
          <LoadingState rows={6} />
        ) : filteredQueries.length === 0 ? (
          <EmptyState title="No support tickets yet" description="Submit your first support query to get started." />
        ) : (
          <div className="space-y-3">
            {filteredQueries.map((ticket) => (
              <article key={ticket._id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:bg-slate-50">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{ticket.message}</p>
                  <StatusBadge status={ticket.status || "pending"} />
                </div>
                {ticket.reply && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Admin Reply: {ticket.reply}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </TenantLayout>
  );
}

export default TenantSupport;
