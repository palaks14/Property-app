import { useEffect, useState } from "react";
import TenantLayout from "../components/tenant/TenantLayout";
import ProfileCard from "../components/common/ProfileCard";
import InputField from "../components/auth/InputField";
import Button from "../components/auth/Button";
import { getSessionUser } from "../utils/sessionUser";
import { getFullProfile, saveBaseUserProfile, saveTenantProfile } from "../services/profileService";

function TenantProfile() {
  const session = getSessionUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", preferredLocation: "", budget: "" });

  useEffect(() => {
    const loadProfile = async () => {
      if (!session.id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getFullProfile(session.id);
        if (data) {
          setProfile(data);
          setForm({
            name: data.name || "",
            phone: data.phone || "",
            preferredLocation: data.preferredLocation || "",
            budget: data.budget || ""
          });
        }
      } catch (error) {
        console.error("Tenant profile load failed", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [session.id]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await saveBaseUserProfile(profile.id, {
        name: form.name,
        email: profile.email,
        role: profile.role,
        phone: form.phone,
        profilePic: profile.profilePic || ""
      });
      await saveTenantProfile(profile.id, {
        preferredLocation: form.preferredLocation,
        budget: form.budget
      });
      setStatus({ type: "success", message: "Profile updated successfully." });
      setProfile((prev) => ({ ...prev, ...form }));
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Unable to save changes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <TenantLayout
      title="Profile"
      subtitle="Manage your personal details and account information."
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search profile settings..."
    >
      {loading ? (
        <div className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-6 w-40 rounded-full bg-slate-200" />
          <div className="h-40 rounded-[28px] bg-slate-200" />
        </div>
      ) : !profile ? (
        <div className="saas-panel">No tenant profile data available.</div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <ProfileCard profile={profile} editable={true} />
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Quick details</h3>
              <p className="mt-3 text-sm text-slate-600">Update these fields to keep your tenant profile polished and ready.</p>
              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <p><span className="font-semibold">Preferred location:</span> {profile.preferredLocation || "Not set"}</p>
                <p><span className="font-semibold">Budget:</span> {profile.budget || "Not set"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Edit profile</h3>
            <p className="mt-2 text-sm text-slate-600">Save changes to your tenant preferences and contact details.</p>
            <form className="mt-6 space-y-5" onSubmit={handleSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Full name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <InputField
                  label="Phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Preferred location"
                  value={form.preferredLocation}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredLocation: event.target.value }))}
                />
                <InputField
                  label="Budget"
                  value={form.budget}
                  onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                />
              </div>
              {status.message ? (
                <div className={`rounded-3xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {status.message}
                </div>
              ) : null}
              <Button type="submit" loading={saving} disabled={saving}>
                Save changes
              </Button>
            </form>
          </div>
        </section>
      )}
    </TenantLayout>
  );
}

export default TenantProfile;
