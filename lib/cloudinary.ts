import crypto from 'crypto';

const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUDINARY_CLOUD_NAME ||
  'oykw0nwc';

export const OFFICIAL_ADYORA_LOGO_URL =
  'https://res.cloudinary.com/oykw0nwc/image/upload/f_auto,q_auto/v1793437509/adyora/brand/adyora_official_logo.png';

/**
 * Generates an optimized Cloudinary delivery URL using standardized width buckets
 * (`400`, `800`, `1200`, `1920`) and `f_auto,q_auto` to protect free-tier transformation quotas.
 */
export function getOptimizedCloudinaryUrl(
  urlOrPublicId: string | undefined | null,
  options?: {
    width?: 400 | 800 | 1200 | 1920;
    crop?: 'fill' | 'fit' | 'limit' | 'pad';
  }
): string {
  if (!urlOrPublicId) return '';

  // If it already contains an explicit transformation (e.g., cropped logo), return as-is
  if (urlOrPublicId.includes('/c_crop,')) {
    return urlOrPublicId;
  }

  const width = options?.width || 800;
  const crop = options?.crop || 'limit';

  const transform = `f_auto,q_auto:best,c_limit,w_${width}`;

  if (urlOrPublicId.startsWith('http://') || urlOrPublicId.startsWith('https://')) {
    if (urlOrPublicId.includes('res.cloudinary.com') && urlOrPublicId.includes('/upload/')) {
      return urlOrPublicId.replace('/upload/', `/upload/${transform}/`);
    }
    return urlOrPublicId;
  }

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${urlOrPublicId}`;
}

/**
 * Generates a SHA-1 signature for authenticated Cloudinary API requests.
 * Must only be invoked on the server.
 */
export function generateCloudinarySignature(
  paramsToSign: Record<string, string | number>
): {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
} {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    'oykw0nwc';

  if (!apiKey || !apiSecret) {
    throw new Error('Cloudinary API credentials are not configured on the server.');
  }

  const timestamp = Number(paramsToSign.timestamp) || Math.floor(Date.now() / 1000);
  const allParams: Record<string, string | number> = {
    ...paramsToSign,
    timestamp,
  };

  const sortedParamString = Object.keys(allParams)
    .filter((key) => allParams[key] !== undefined && allParams[key] !== '')
    .sort()
    .map((key) => `${key}=${allParams[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(sortedParamString + apiSecret)
    .digest('hex');

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
  };
}

/**
 * Uploads an image file (File / Blob / base64 data URI) from an authenticated server route to Cloudinary.
 */
export async function uploadImageToCloudinary(
  fileData: File | Blob | string,
  folder = 'adyora/general'
): Promise<{ public_id: string; secure_url: string; width: number; height: number }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const { signature, apiKey, cloudName } = generateCloudinarySignature({
    folder,
    timestamp,
  });

  const formData = new FormData();
  formData.append('file', fileData);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Cloudinary image upload failed.');
  }

  return {
    public_id: data.public_id,
    secure_url: data.secure_url,
    width: data.width,
    height: data.height,
  };
}

/**
 * Deletes an asset from Cloudinary by `public_id` to prevent orphaned storage usage.
 */
export async function deleteImageFromCloudinary(publicId: string): Promise<boolean> {
  if (
    !publicId ||
    publicId === 'ADYORA_Streetwear_E_Commerce_Mockup' ||
    publicId === 'adyora/brand/adyora_official_logo'
  ) {
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const { signature, apiKey, cloudName } = generateCloudinarySignature({
    public_id: publicId,
    timestamp,
  });

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  return response.ok && data.result === 'ok';
}

