import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function configureCloudinary() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary env vars missing: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  configured = true;
}

export { cloudinary };
