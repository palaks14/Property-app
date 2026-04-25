import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

function ProfileCard({ profile, children, editable }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_60px_-36px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
          {profile?.profilePic || profile?.profilePicUrl ? (
            <img
              src={profile.profilePic || profile.profilePicUrl}
              alt={profile.name}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "";
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-slate-100 text-3xl font-semibold text-slate-500">
              {profile?.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 className="text-2xl font-semibold text-slate-900">{profile?.name || "Guest User"}</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-600">
              {profile?.role || "user"}
            </span>
          </div>
          <p className="text-sm text-slate-500">{profile?.email || "No email available"}</p>
          {profile?.phone ? <p className="text-sm text-slate-500">{profile.phone}</p> : null}
          {children}
        </div>
      </div>

      {profile?.role === "landlord" ? (
        <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Landlord profile details</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Property name</p>
              <p className="mt-1 text-sm text-slate-900">{profile.propertyName || "Not set"}</p>
            </div>
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Location</p>
              <p className="mt-1 text-sm text-slate-900">{profile.propertyLocation || "Not set"}</p>
            </div>
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Rent amount</p>
              <p className="mt-1 text-sm text-slate-900">{profile.propertyPrice ? `₹${profile.propertyPrice}` : "Not set"}</p>
            </div>
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Facilities</p>
              <p className="mt-1 text-sm text-slate-900">{profile.propertyFacilities?.length ? String(profile.propertyFacilities).replace(/,/g, ", ") : "Not set"}</p>
            </div>
          </div>
          {profile.propertyImage ? (
            <div className="mt-5 rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <img src={profile.propertyImage} alt={profile.propertyName || "Property"} className="h-52 w-full object-cover" />
            </div>
          ) : null}
        </div>
      ) : null}

      {editable ? (
        <button
          type="button"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={() => navigate(`/complete-profile?role=${profile?.role || "tenant"}`)}
        >
          Edit profile
          <ArrowRight size={16} />
        </button>
      ) : null}
    </div>
  );
}

export default ProfileCard;
