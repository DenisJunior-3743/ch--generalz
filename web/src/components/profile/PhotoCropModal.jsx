import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import Modal from "../Modal";
import { getCroppedImageBlob } from "./cropImage";
import { uploadMyPhoto } from "../../api/profile";
import { getErrorMessage } from "../../api/errors";

export default function PhotoCropModal({ file, onClose, onUploaded }) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => () => URL.revokeObjectURL(imageSrc), [imageSrc]);

  const handleCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handleClose() {
    if (pending) return; // don't yank the modal away mid-upload
    onClose();
  }

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setPending(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const result = await uploadMyPhoto(blob);
      onUploaded(result.photo_url);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't upload the photo. Try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title="Crop your photo" onClose={handleClose} size="lg">
      <div className="relative h-80 w-full overflow-hidden rounded-md bg-background">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="flex-1 accent-navy"
        />
      </div>

      {error && <p className="form-banner form-banner--error mt-4">{error}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="pagination-button"
          onClick={handleClose}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="form-submit"
          onClick={handleSave}
          disabled={pending || !croppedAreaPixels}
        >
          {pending ? "Uploading…" : "Save photo"}
        </button>
      </div>
    </Modal>
  );
}
