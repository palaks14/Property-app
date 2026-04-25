import axios from "axios";
import { auth } from "../firebase";

function authHeaderConfig() {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

function shouldCompressImage(file) {
  return file?.type?.startsWith("image/") && file.size > 500000;
}

async function compressImageFile(file) {
  if (!shouldCompressImage(file)) return file;

  try {
    const imageBitmap = await createImageBitmap(file);
    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
    if (scale === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imageBitmap.width * scale);
    canvas.height = Math.round(imageBitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.75));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch (error) {
    console.warn("Image compression failed, uploading original file", error);
    return file;
  }
}

export async function uploadProfileImage(file, _uid, onProgress) {
  if (!file) return "";
  const uploadFile = await compressImageFile(file);
  const fileData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(uploadFile);
  });

  const response = await axios.post(
    "/api/profile/photo",
    {
      fileName: uploadFile.name,
      fileData
    },
    {
      ...authHeaderConfig(),
      onUploadProgress: (progressEvent) => {
        if (!onProgress || !progressEvent.lengthComputable) return;
        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onProgress(progress);
      }
    }
  );

  return response.data?.url || "";
}

export async function saveBaseUserProfile(uid, payload) {
  if (!uid) throw new Error("Missing user id");
  await axios.put("/api/profile", payload, authHeaderConfig());
}

export async function saveTenantProfile(uid, payload) {
  if (!uid) throw new Error("Missing user id");
  await axios.put("/api/profile", payload, authHeaderConfig());
}

export async function saveLandlordProfile(uid, payload) {
  if (!uid) throw new Error("Missing user id");
  await axios.put("/api/profile", payload, authHeaderConfig());
}

export async function getUserById(uid) {
  if (!uid) return null;
  const response = await axios.get(`/api/profile/${uid}`);
  const data = response.data || null;
  return data ? { ...data, id: data.id || data._id } : null;
}

export async function getProfileById(uid) {
  if (!uid) return null;
  const response = await axios.get(`/api/profile/${uid}`);
  const data = response.data || null;
  return data ? { ...data, id: data.id || data._id } : null;
}

export async function getFullProfile(uid) {
  const firebaseUid = auth.currentUser?.uid || "";

  if (uid && uid !== firebaseUid) {
    return getUserById(uid);
  }

  if (uid && uid === firebaseUid) {
    try {
      const response = await axios.get("/api/profile", authHeaderConfig());
      const data = response.data || null;
      return data ? { ...data, id: data.id || data._id } : null;
    } catch (_error) {
      return null;
    }
  }

  const response = await axios.get("/api/profile", authHeaderConfig());
  const data = response.data || null;
  return data ? { ...data, id: data.id || data._id } : null;
}

export function getCurrentFirebaseUserId() {
  return auth.currentUser?.uid || "";
}
