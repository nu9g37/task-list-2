export async function readProfileImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Please choose a JPG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Please choose an image smaller than 5 MB.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Could not read this image. Please choose another file."); }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare your profile image.");
    const side = Math.min(bitmap.width, bitmap.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 256, 256);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
    // Keep the avatar small enough to persist in the existing user image field.
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    bitmap.close();
  }
}
