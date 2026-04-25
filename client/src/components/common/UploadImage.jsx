import { useEffect, useMemo, useState } from "react";

function UploadImage({ value, onChange, label, hint }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!value) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

  const fileName = useMemo(() => (value ? value.name : "Choose a profile photo"), [value]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500 shadow-sm">
            {preview ? (
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm">Preview</span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="text-sm text-slate-500">{hint}</p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
          Browse
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onChange(file);
            }}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">{fileName}</p>
    </div>
  );
}

export default UploadImage;
