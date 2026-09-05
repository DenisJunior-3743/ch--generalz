const OUTPUT_SIZE = 512;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = src;
  });
}

/**
 * Draws the region react-easy-crop reports (in source-image pixels) into a
 * fixed OUTPUT_SIZE square canvas, and returns it as a JPEG Blob ready for
 * uploadMyPhoto(). Fixing the output size keeps every uploaded photo a
 * consistent, reasonably-sized square regardless of the source image's
 * resolution.
 */
export async function getCroppedImageBlob(imageSrc, croppedAreaPixels) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.9,
    );
  });
}
