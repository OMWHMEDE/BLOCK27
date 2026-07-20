// Client-safe photo constants. No server imports live here, so both the
// browser capture component and the server storage helper can share them.

export const USER_PHOTOS_BUCKET = "user-photos";

export const BASE_PHOTO_FILENAME = "base_photo.jpg";

// Objects are namespaced by user id as the FIRST path segment. The storage RLS
// policy (BUILD-01) enforces `(storage.foldername(name))[1] = auth.uid()`, so
// this is the only shape that a user is allowed to read or write.
export function basePhotoPath(userId: string) {
  return `${userId}/${BASE_PHOTO_FILENAME}`;
}
