import { describe, it, expect } from "vitest";
import {
  photoRefKeys,
  taggedPhotoMatches,
  removeReferencesForFace,
  normalizeFaceIndex,
} from "../../src/utils/faceIndex.js";

describe("faceIndex sync keys", () => {
  it("taggedPhotoMatches treats owner/photoId as strings", () => {
    const { ownerKey, photoKey } = photoRefKeys(42, 1001);
    expect(ownerKey).toBe("42");
    expect(photoKey).toBe("1001");

    expect(
      taggedPhotoMatches(
        { source: "tagged", owner: "42", photoId: "1001" },
        ownerKey,
        photoKey,
      ),
    ).toBe(true);
    expect(
      taggedPhotoMatches(
        { source: "tagged", owner: 42, photoId: 1001 },
        ownerKey,
        photoKey,
      ),
    ).toBe(true);
    expect(
      taggedPhotoMatches(
        { source: "tagged", owner: "42", photoId: "999" },
        ownerKey,
        photoKey,
      ),
    ).toBe(false);
  });

  it("removeReferencesForFace drops one face regardless of number/string ids", () => {
    const index = normalizeFaceIndex({
      references: [
        {
          personId: 1,
          source: "tagged",
          owner: "10",
          photoId: "p1",
          faceId: "f1",
          descriptor: [0.1],
        },
        {
          personId: 1,
          source: "tagged",
          owner: 10,
          photoId: "p1",
          faceId: "f2",
          descriptor: [0.2],
        },
      ],
    });

    const next = removeReferencesForFace(index, {
      owner: 10,
      photoId: "p1",
      faceId: "f1",
    });
    expect(next.references).toHaveLength(1);
    expect(next.references[0].faceId).toBe("f2");
  });
});