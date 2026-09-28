import { SystemConfig } from '../types';

export const DEFAULT_CLOUDINARY_CONFIG = {
  cloudName: 'dvpj3etcm',
  uploadPreset: 'fexambythongtran',
};

const DEFAULT_CLOUD_NAME = 'dvpj3etcm';
const DEFAULT_UPLOAD_PRESET = 'fexambythongtran';

/**
 * Upload image to Cloudinary via Direct REST API
 */
export async function uploadImageToCloudinary(
  file: File,
  config?: SystemConfig['cloudinaryConfig']
): Promise<{ url: string; error?: string }> {
  try {
    const cloudName = config?.cloudName || localStorage.getItem('fexam_cloudinary_name') || DEFAULT_CLOUD_NAME;
    const uploadPreset = config?.uploadPreset || localStorage.getItem('fexam_cloudinary_preset') || DEFAULT_UPLOAD_PRESET;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Cloudinary upload warning:', errData);
      // Fallback to Base64 data URL if upload fails so user can still preview smoothly
      const dataUrl = await readFileAsDataURL(file);
      return { url: dataUrl };
    }

    const data = await response.json();
    return { url: data.secure_url || data.url };
  } catch (error: any) {
    console.warn('Cloudinary upload error:', error);
    // Fallback to Data URL
    try {
      const dataUrl = await readFileAsDataURL(file);
      return { url: dataUrl };
    } catch {
      return { url: '', error: error?.message || 'Tải ảnh thất bại' };
    }
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
