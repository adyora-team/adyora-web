'use client';

import React, { useState } from 'react';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface CloudinaryUploaderProps {
  label: string;
  folder: string;
  imageUrl: string;
  publicId: string;
  focalX?: number;
  focalY?: number;
  onUploaded: (result: { public_id: string; secure_url: string }) => void;
  onDeleted?: () => void;
  onFocalChange?: (focalX: number, focalY: number) => void;
  aspectRatioClass?: string;
}

export function CloudinaryUploader({
  label,
  folder,
  imageUrl,
  publicId,
  focalX = 50,
  focalY = 50,
  onUploaded,
  onDeleted,
  onFocalChange,
  aspectRatioClass = 'aspect-[4/5] w-40',
}: CloudinaryUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      if (publicId) {
        formData.append('previousPublicId', publicId);
      }

      const res = await fetch('/api/admin/cloudinary', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploaded({
        public_id: data.public_id,
        secure_url: data.secure_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!imageUrl) return;
    setUploading(true);
    setError('');
    try {
      if (publicId) {
        await fetch('/api/admin/cloudinary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: publicId }),
        });
      }
      onDeleted?.();
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
        {label}
      </label>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={`relative overflow-hidden border border-[#E5E5E5] bg-[#F4F4F4] ${aspectRatioClass}`}
        >
          {imageUrl ? (
            <img
              src={getOptimizedCloudinaryUrl(imageUrl, { width: 800 })}
              alt={label}
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
              }}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              No Image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 bg-[#080808] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0066FF] transition">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            <span>
              {uploading
                ? 'Uploading...'
                : imageUrl
                ? 'Replace Image'
                : 'Upload to Cloudinary'}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {imageUrl && onDeleted && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3" /> Remove Image
            </button>
          )}

          {onFocalChange && (
            <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="block text-neutral-500">Focal X ({focalX}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalX}
                  onChange={(e) => onFocalChange(Number(e.target.value), focalY)}
                  className="w-28 accent-[#080808]"
                />
              </div>
              <div>
                <span className="block text-neutral-500">Focal Y ({focalY}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalY}
                  onChange={(e) => onFocalChange(focalX, Number(e.target.value))}
                  className="w-28 accent-[#080808]"
                />
              </div>
            </div>
          )}

          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

