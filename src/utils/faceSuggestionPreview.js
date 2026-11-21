/** URL миниатюры эталонного лица для подсказки «похоже на». */
export async function resolveFaceMatchPreviewUrl(matchRef, allPhotos = []) {
  if (!matchRef || typeof matchRef !== "object") return null;

  if (matchRef.source === "avatar") {
    if (matchRef.externalEntityId && window.externalAPI?.avatar?.getPath) {
      return window.externalAPI.avatar.getPath(matchRef.externalEntityId);
    }
    if (matchRef.personId != null && window.avatarAPI?.getPath) {
      return window.avatarAPI.getPath(matchRef.personId);
    }
    return null;
  }

  if (
    matchRef.source === "tagged" &&
    matchRef.owner != null &&
    matchRef.photoId != null &&
    window.photoAPI?.getPath
  ) {
    const ownerKey = String(matchRef.owner);
    const photoKey = String(matchRef.photoId);
    const photo = allPhotos.find(
      (p) => String(p.owner) === ownerKey && String(p.id) === photoKey,
    );
    if (!photo?.filename) return null;
    return window.photoAPI.getPath(photo.owner, photo.filename, "thumbs");
  }

  return null;
}