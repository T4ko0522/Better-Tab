const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i;
const IMAGE_EXTENSION_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i;

const getPathnameFromUrl = (url: string): string | null => {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return null;
  }
};

export const isVideoMediaUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith("data:video/")) return true;

  const pathname = getPathnameFromUrl(url);
  if (!pathname) return false;
  return VIDEO_EXTENSION_RE.test(pathname);
};

export const isImageMediaUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;

  const pathname = getPathnameFromUrl(url);
  if (!pathname) return false;
  return IMAGE_EXTENSION_RE.test(pathname);
};
