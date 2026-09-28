// Browser-only: shrinks a photo/screenshot to a JPEG small enough for the
// free Storage quota (typically 150–250 KB) while keeping a heart-rate
// graph legible. Phone screenshots are ~1170×2532 PNGs of several MB.
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht gelesen werden."));
    };
    img.src = url;
  });
}

function encode(img: HTMLImageElement, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Bild konnte nicht verarbeitet werden."));
  // JPEG has no alpha — paint white first so transparent PNGs don't turn black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Bild konnte nicht verarbeitet werden."))), "image/jpeg", quality)
  );
}

const TARGET_BYTES = 350 * 1024;

export async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  let blob = await encode(img, 1600, 0.72);
  if (blob.size > TARGET_BYTES) blob = await encode(img, 1280, 0.6);
  if (blob.size > TARGET_BYTES) blob = await encode(img, 1024, 0.5);
  return blob;
}
