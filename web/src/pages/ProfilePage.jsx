import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import { getStaffById } from "../api/staff";
import { getStudentByRegNumber } from "../api/students";
import { deleteMyPhoto } from "../api/profile";
import { useFaculties } from "../hooks/useFaculties";
import { usePrograms } from "../hooks/usePrograms";
import { formatRegNumber } from "../utils/format";
import PhotoCropModal from "../components/profile/PhotoCropModal";
import { IconTrash } from "../components/icons";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * The backend's `profile` module only covers the photo (PUT/DELETE
 * /me/photo) — there's no endpoint to edit name/email/etc, so everything
 * below the photo is a read-only view built from whatever's already
 * fetchable: the account's own /auth/me data, plus (for staff/student
 * accounts) the linked Staff/Student record via the same ownership-safe
 * endpoints StaffPage/StudentsPage already use.
 */
export default function ProfilePage() {
  const { user, updatePhotoUrl } = useAuth();
  const canUpdatePhoto = hasPermission(user, "profile", "update");
  const canDeletePhoto = hasPermission(user, "profile", "delete") && Boolean(user?.photo_url);

  const [linked, setLinked] = useState({ status: "loading", record: null, message: "" });
  const [pendingFile, setPendingFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);

  const { faculties } = useFaculties();
  const { programs } = usePrograms();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (user?.staff_id) {
        try {
          const record = await getStaffById(user.staff_id);
          if (!cancelled) setLinked({ status: "loaded", record, message: "" });
        } catch (error) {
          if (!cancelled) {
            setLinked({ status: "error", record: null, message: error.detail || "Couldn't load your staff record." });
          }
        }
      } else if (user?.student_reg_number) {
        try {
          const record = await getStudentByRegNumber(user.student_reg_number);
          if (!cancelled) setLinked({ status: "loaded", record, message: "" });
        } catch (error) {
          if (!cancelled) {
            setLinked({ status: "error", record: null, message: error.detail || "Couldn't load your student record." });
          }
        }
      } else if (!cancelled) {
        setLinked({ status: "loaded", record: null, message: "" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.staff_id, user?.student_reg_number]);

  const displayName = user?.last_name || user?.username || "";
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";

  function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileError(null);
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setFileError("Use a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("Image is too large — 5MB max.");
      return;
    }
    setPendingFile(file);
  }

  async function handleRemovePhoto() {
    setRemoving(true);
    setRemoveError(null);
    try {
      await deleteMyPhoto();
      updatePhotoUrl(null);
    } catch (error) {
      setRemoveError(error.detail || "Couldn't remove the photo.");
    } finally {
      setRemoving(false);
    }
  }

  const facultyName = linked.record?.faculty_id
    ? faculties.find((f) => f.id === linked.record.faculty_id)?.name
    : null;
  const programName = linked.record?.program_id
    ? programs.find((p) => p.id === linked.record.program_id)?.name
    : null;

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Your account details and profile photo.</p>
      </div>

      <div className="panel">
        <h2>Photo</h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <span className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-4xl font-semibold text-white">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </span>

          <div className="flex flex-col items-center gap-2 sm:items-start">
            {canUpdatePhoto && (
              <label className="form-submit inline-block">
                {user?.photo_url ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept={ACCEPTED_PHOTO_TYPES.join(",")}
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </label>
            )}
            {canDeletePhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={removing}
                className="pagination-button flex items-center gap-1.5 text-danger-dark [&>svg]:h-3.5 [&>svg]:w-3.5"
              >
                <IconTrash />
                {removing ? "Removing…" : "Remove photo"}
              </button>
            )}
            {fileError && <p className="text-xs text-danger">{fileError}</p>}
            {removeError && <p className="text-xs text-danger">{removeError}</p>}
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF — 5MB max.</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Details</h2>

        {linked.status === "loading" && <p className="list-state">Loading your details…</p>}
        {linked.status === "error" && <p className="list-state list-state--error">{linked.message}</p>}

        {linked.status === "loaded" && (
          <div>
            <DetailRow label="Username" value={user?.username} />
            <DetailRow label="Role" value={capitalize(user?.role)} />
            {linked.record && (
              <>
                <DetailRow label="Name" value={`${linked.record.first_name} ${linked.record.last_name}`} />
                <DetailRow label="Email" value={linked.record.email} />
                <DetailRow label="Phone" value={linked.record.phone_number} />
                <DetailRow label="Gender" value={capitalize(linked.record.gender)} />
                {linked.record.reg_number && (
                  <>
                    <DetailRow label="Registration number" value={formatRegNumber(linked.record.reg_number)} />
                    <DetailRow label="Faculty" value={facultyName} />
                    <DetailRow label="Program" value={programName} />
                    <DetailRow label="Intake year" value={linked.record.intake_year} />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {pendingFile && (
        <PhotoCropModal
          file={pendingFile}
          onClose={() => setPendingFile(null)}
          onUploaded={(photoUrl) => {
            updatePhotoUrl(photoUrl);
            setPendingFile(null);
          }}
        />
      )}
    </div>
  );
}
