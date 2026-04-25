import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getFullProfile } from "../services/profileService";
import { getSessionUser } from "../utils/sessionUser";
import ProfileCard from "../components/common/ProfileCard";

function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState({ loading: true, message: "" });
  const session = getSessionUser();

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const data = await getFullProfile(id);
        if (!active) return;
        if (!data) {
          setStatus({ loading: false, message: "Profile not found." });
          return;
        }
        setProfile(data);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setStatus({ loading: false, message: "Unable to load profile." });
      } finally {
        if (active) setStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, [id]);

  if (status.loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl animate-pulse rounded-[32px] bg-white/80 p-10 shadow-lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-lg">
          <p className="text-lg font-semibold text-slate-900">{status.message || "No profile found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_0.8fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl shadow-slate-950/30">
          <ProfileCard profile={profile} editable={session.id === profile.id}>
            <div className="mt-4 rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">About this profile</p>
              <div className="mt-3 space-y-2">
                {profile.role === "tenant" ? (
                  <>
                    <p><span className="font-semibold text-slate-300">Preferred location:</span> {profile.preferredLocation || "Not set"}</p>
                    <p><span className="font-semibold text-slate-300">Budget:</span> {profile.budget || "Not set"}</p>
                  </>
                ) : (
                  <>
                    <p><span className="font-semibold text-slate-300">Property type:</span> {profile.propertyType || "Not set"}</p>
                    <p><span className="font-semibold text-slate-300">Address:</span> {profile.address || "Not set"}</p>
                  </>
                )}
                <p><span className="font-semibold text-slate-300">Member since:</span>{" "}{profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : profile.createdAt || "Unknown"}</p>
              </div>
            </div>
          </ProfileCard>
        </div>

        <aside className="space-y-6 rounded-[32px] border border-slate-200/20 bg-slate-950/80 p-8 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.45)]">
          <div className="rounded-3xl bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.26em] text-sky-300/80">Profile insights</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <p>Showcase your role and latest profile information so matches can trust your listing or booking requests.</p>
              <p>Profiles are stored securely in MongoDB and updated instantly when you save changes.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-900/80 p-5 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Role</p>
              <p className="mt-3 text-lg font-semibold text-white">{profile.role}</p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 p-5 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contact</p>
              <p className="mt-3 text-lg font-semibold text-white">{profile.phone || "Not shared"}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PublicProfile;
