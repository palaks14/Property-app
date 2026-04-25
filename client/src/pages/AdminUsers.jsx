import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ShieldAlert, Trash2, UserCheck } from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import ConfirmModal from "../components/admin/ConfirmModal";
import EmptyState from "../components/admin/EmptyState";
import LoadingState from "../components/admin/LoadingState";
import StatusBadge from "../components/admin/StatusBadge";

const PAGE_SIZE = 8;

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState({ open: false, type: "", user: null });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/users");
      setUsers(response.data || []);
    } catch (error) {
      console.error("Unable to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const decoratedUsers = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        moderationStatus: user.isApproved ? "approved" : user.role === "landlord" ? "pending" : "active"
      })),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return decoratedUsers.filter((user) => {
      const roleMatches = roleFilter === "all" ? true : user.role === roleFilter;
      const statusMatches = statusFilter === "all" ? true : user.moderationStatus === statusFilter;
      const textMatches = term
        ? [user.name, user.email, user.phone, user.role].some((field) =>
            String(field || "")
              .toLowerCase()
              .includes(term)
          )
        : true;

      return roleMatches && statusMatches && textMatches;
    });
  }, [decoratedUsers, roleFilter, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const openModal = (type, user) => setModalState({ open: true, type, user });
  const closeModal = () => setModalState({ open: false, type: "", user: null });

  const approveUser = async (id) => {
    await axios.put(`/api/approve/${id}`);
    await fetchUsers();
  };

  const handleActionConfirm = async () => {
    const { type, user } = modalState;
    if (!user) return;

    try {
      if (type === "approve") {
        await approveUser(user._id);
      } else if (type === "block") {
        setUsers((prev) => prev.map((item) => (item._id === user._id ? { ...item, isApproved: false } : item)));
      } else if (type === "delete") {
        setUsers((prev) => prev.filter((item) => item._id !== user._id));
      }
    } catch (error) {
      console.error("User action failed", error);
    } finally {
      closeModal();
    }
  };

  const modalCopy = {
    approve: {
      title: "Approve landlord account?",
      message: "The selected landlord will get access to the platform immediately.",
      tone: "primary",
      confirmText: "Approve"
    },
    block: {
      title: "Block this user?",
      message: "This updates moderation status in the admin panel. Connect a backend block endpoint to enforce login restrictions.",
      tone: "danger",
      confirmText: "Block user"
    },
    delete: {
      title: "Delete user from list?",
      message: "This currently removes the user from dashboard state only.",
      tone: "danger",
      confirmText: "Delete user"
    }
  };

  const modalDetails = modalCopy[modalState.type] || modalCopy.approve;

  return (
    <AdminLayout
      title="User Management"
      subtitle="Approve landlords and track account moderation status."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search users by name, email, phone, or role..."
    >
      <section className="saas-panel">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            className="saas-control w-full sm:w-auto"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="saas-control w-full sm:w-auto"
          >
            <option value="all">All status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
          </select>
        </div>

        {loading ? (
          <LoadingState rows={7} />
        ) : paginatedUsers.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search or filter combination." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <p className="font-semibold text-slate-900">{user.name || "Unnamed user"}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="capitalize text-slate-700">{user.role || "-"}</td>
                      <td className="text-slate-600">{user.phone || "-"}</td>
                      <td>
                        <StatusBadge status={user.moderationStatus} />
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-2">
                          {user.role === "landlord" && !user.isApproved && (
                            <button
                              onClick={() => openModal("approve", user)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
                            >
                              <UserCheck size={14} />
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => openModal("block", user)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-400"
                          >
                            <ShieldAlert size={14} />
                            Block
                          </button>
                          <button
                            onClick={() => openModal("delete", user)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-rose-500"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredUsers.length)} of{" "}
                {filteredUsers.length} users
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} of {pageCount}
                </span>
                <button
                  disabled={page === pageCount}
                  onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <ConfirmModal
        open={modalState.open}
        title={modalDetails.title}
        message={modalDetails.message}
        tone={modalDetails.tone}
        confirmText={modalDetails.confirmText}
        onCancel={closeModal}
        onConfirm={handleActionConfirm}
      />
    </AdminLayout>
  );
}

export default AdminUsers;
