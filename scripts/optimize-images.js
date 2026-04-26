/**
 * scripts/optimize-images.js
 *
 * Generates multiple resolutions and compresses all PNG/JPG assets in
 * src/assets/images/ using the `sharp` library.
 *
 * Run with: npm run optimize:images
 * Requires: npm install --save-dev sharp
 *
 * Output resolutions: 1x, 2x, 3x (suffixed @2x, @3x for React Native).
 * Formats: keeps PNG for icons/logos; converts photos to JPEG at quality 80.
 *
 * Adds significantly to APK size if large covers are bundled.
 * Prefer loading covers from CDN at runtime (expo-image handles caching).
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const INPUT_DIR = path.join(__dirname, "../assets/images");
const OUTPUT_DIR = path.join(__dirname, "../assets/images/optimized");

// Resolutions to generate (multiplier -> suffix)
const RESOLUTIONS = [
  { scale: 1, suffix: "" },
  { scale: 2, suffix: "@2x" },
  { scale: 3, suffix: "@3x" },
];

// Base size for app icon variants
const ICON_BASE = 48;

async function processImage(inputPath, filename) {
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, ext);
  const isIcon = base.includes("icon") || base.includes("logo");
  const isPhoto = !isIcon;

  for (const { scale, suffix } of RESOLUTIONS) {
    const outFilename = `${base}${suffix}${ext}`;
    const outPath = path.join(OUTPUT_DIR, outFilename);

    let pipeline = sharp(inputPath);

    // Resize: photos scale by viewport-appropriate sizes; icons use fixed sizes
    if (isIcon) {
      const size = ICON_BASE * scale;
      pipeline = pipeline.resize(size, size, { fit: "contain", background: "transparent" });
    } else {
      // For photos: limit max width to 720 * scale (covers won't exceed 720px)
      pipeline = pipeline.resize(Math.floor(720 * scale), null, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Compression settings
    if (ext === ".png") {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    } else if (ext === ".jpg" || ext === ".jpeg") {
      // Photos: JPEG at quality 80 — good balance for album art
      pipeline = pipeline.jpeg({ quality: isPhoto ? 80 : 95, mozjpeg: true });
    } else if (ext === ".webp") {
      pipeline = pipeline.webp({ quality: 80 });
    }

    await pipeline.toFile(outPath);
    const { size } = fs.statSync(outPath);
    console.log(`  ${outFilename} — ${(size / 1024).toFixed(1)} KB`);
  }
}

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(INPUT_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp"].includes(ext);
  });

  if (files.length === 0) {
    console.log("No image files found in", INPUT_DIR);
    return;
  }

  console.log(`Processing ${files.length} image(s)...\n`);
  for (const file of files) {
    console.log(`→ ${file}`);
    await processImage(path.join(INPUT_DIR, file), file);
  }

  console.log("\nDone. Optimized images written to:", OUTPUT_DIR);
  console.log("Replace bundled images with optimized versions for production.");
}

run().catch((err) => {
  console.error("Image optimization failed:", err.message);
  process.exit(1);
});
