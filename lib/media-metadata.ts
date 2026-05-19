import exifr from "exifr";

export type ExtractedPhotoMetadata = {
  photoDate: string | null;
  latitude: number | null;
  longitude: number | null;
};

function normalizeFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeExifDate(value: unknown) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString().slice(0, 10);
}

function isPhotoFile(file: File) {
  return file.type.startsWith("image/");
}

export async function extractPhotoMetadata(file: File | null | undefined): Promise<ExtractedPhotoMetadata> {
  if (!(file instanceof File) || file.size === 0 || !isPhotoFile(file)) {
    return {
      photoDate: null,
      latitude: null,
      longitude: null
    };
  }

  try {
    const tags = (await exifr.parse(Buffer.from(await file.arrayBuffer()), {
      pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"]
    })) as
      | {
          DateTimeOriginal?: Date;
          CreateDate?: Date;
          latitude?: number;
          longitude?: number;
        }
      | undefined;

    return {
      photoDate: normalizeExifDate(tags?.DateTimeOriginal ?? tags?.CreateDate ?? null),
      latitude: normalizeFiniteNumber(tags?.latitude),
      longitude: normalizeFiniteNumber(tags?.longitude)
    };
  } catch (error) {
    console.error("Photo metadata extraction failed", error);
    return {
      photoDate: null,
      latitude: null,
      longitude: null
    };
  }
}
