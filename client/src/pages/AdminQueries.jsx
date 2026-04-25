import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AdminLayout from "../components/admin/AdminLayout";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";

function AdminQueries() {
  const [queries, setQueries] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/query");
      setQueries(response.data || []);
    } catch (error) {
      console.error("Query fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const filteredQueries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queries.filter((query) => {
      const normalizedStatus = String(query.status || "").toLowerCase();
      const statusMatched = statusFilter === "all" ? true : normalizedStatus === statusFilter;
      const textMatched = term
        ? [query.message, query.category, query.reply].some((field) =>
            String(field || "")
              .toLowerCase()
              .includes(term)
          )
        : true;

      return statusMatched && textMatched;
    });
  }, [queries, search, statusFilter]);

  const sendReply = async (id) => {
    if (!replyText[id] || replyText[id].trim() === "") {
      alert("Please write a reply before submitting.");
      return;
    }

    try {
      await axios.put(`/api/query/reply/${id}`, { reply: replyText[id] });
      setReplyText((prev) => ({ ...prev, [id]: "" }));
      await fetchQueries();
    } catch (error) {
      console.error("Reply failed", error);
    }
  };

  return (
    <AdminLayout
      title="Support Queries"
      subtitle="Review incoming tenant and landlord requests."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by query text, category, or reply..."
    >
      <section className="saas-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">Total queries: {queries.length}</p>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="saas-control w-full sm:w-auto"
          >
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {loading ? (
          <LoadingState rows={6} />
        ) : filteredQueries.length === 0 ? (
          <EmptyState title="No queries found" description="Try another search term or status filter." />
        ) : (
          <div className="space-y-3">
            {filteredQueries.map((query) => (
              <article key={query._id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-slate-50">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800">{query.message || "No message provided"}</p>
                    <p className="text-xs text-slate-500">Category: {query.category || "General"}</p>
                  </div>
                  <StatusBadge status={query.status || "pending"} />
                </div>

                {query.reply ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Reply: {query.reply}
                  </div>
                ) : (
                  <div className="mt-3">
                    <textarea
                      rows={2}
                      value={replyText[query._id] || ""}
                      onChange={(event) => setReplyText((prev) => ({ ...prev, [query._id]: event.target.value }))}
                      placeholder="Write a helpful reply..."
                      className="saas-control w-full p-2.5"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => sendReply(query._id)}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

export default AdminQueries;
