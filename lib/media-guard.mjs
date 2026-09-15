// Refuse to embed a file that is not really an image.
//
// `public/sources/tiktok-comments-real.png` turned out to be the saved HTML of a
// follower-selling site — a download that went wrong months ago and sat there
// with a .png extension. Nothing had read it yet, but the moment a step pointed
// at it the video would have carried a broken image, or worse, embedded a sales
// page's markup as a data URI.
//
// The rule the videos are held to is that everything on screen is real. A file
// extension is not evidence of anything; the first bytes are.
import { existsSync, readFileSync } from "node:fs";

const SIGNATURES = [
  { type: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  // RIFF....WEBP — the middle four bytes are the file size
  { type: "webp", bytes: [0x52, 0x49, 0x46, 0x46], at8: [0x57, 0x45, 0x42, 0x50] },
];

// Returns the real image type, or "" when the file is not an image.
export function imageType(path) {
  if (!path || !existsSync(path)) return "";
  // The final, offline fallback is an explicitly-labelled SVG. It is not a
  // disguised photograph or app screen; recognising it lets it pass the same
  // file and dimension gate as every other visual asset.
  try {
    if (readFileSync(path, "utf8").trimStart().startsWith("<svg")) return "svg";
  } catch { /* Binary files are handled by their signatures below. */ }
  let head;
  try { head = readFileSync(path).subarray(0, 12); } catch { return ""; }
  for (const sig of SIGNATURES) {
    if (!sig.bytes.every((b, i) => head[i] === b)) continue;
    if (sig.at8 && !sig.at8.every((b, i) => head[8 + i] === b)) continue;
    return sig.type;
  }
  return "";
}

// Throws with a message that names the file, so a broken asset is fixed rather
// than silently skipped and forgotten.
export function assertImage(path) {
  if (!existsSync(path)) throw new Error(`تصویر پیدا نشد: ${path}`);
  const type = imageType(path);
  if (!type) throw new Error(`این فایل تصویر نیست: ${path} — با پسوند عکس ذخیره شده ولی محتوایش چیز دیگری است.`);
  return type;
}

// Pixel dimensions, read from the file's own header.
//
// A screenshot published by a platform newsroom is usually a wide montage of
// several phone frames, not one phone screen. Dropped into a portrait phone
// frame with object-fit:contain, a 1200x668 montage shrinks to a stamp — the
// real interface is on screen and unreadable, which is the same as not showing
// it. The layout needs to know the shape before it picks a frame, and the file
// is the only honest source for that.
//
// Returns null when the header cannot be read, so a caller falls back rather
// than trusting a guessed number.
export function imageSize(path) {
  let buf;
  try {
    buf = readFileSync(path);
  } catch {
    return null;
  }
  // The local contextual fallback declares an explicit vertical viewport.
  if (buf.subarray(0, 300).toString("utf8").trimStart().startsWith("<svg")) {
    const tag = buf.subarray(0, 600).toString("utf8").match(/<svg\b[^>]*\bwidth=["'](\d+)[^"']*["'][^>]*\bheight=["'](\d+)[^"']*["']/i);
    if (tag) return { width: Number(tag[1]), height: Number(tag[2]) };
  }
  // PNG: IHDR width/height are big-endian at a fixed offset.
  if (buf.length > 24 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk the segment chain to the first frame header.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // SOF0..SOF15, excluding the non-frame markers in that range.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}
