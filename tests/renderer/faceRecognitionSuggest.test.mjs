import { describe, it, expect } from "vitest";
import {
  suggestPerson,
  suggestPersonsForFaces,
} from "../../src/services/faceRecognition.js";

const baseDescriptor = Array.from({ length: 128 }, (_, i) => i * 0.001);

describe("suggestPerson matchReference", () => {
  it("returns preview ref for closest tagged match", () => {
    const near = baseDescriptor.map((v) => v + 0.01);
    const refs = [
      {
        personId: 2,
        source: "tagged",
        owner: "10",
        photoId: "p-old",
        faceId: "f1",
        descriptor: baseDescriptor,
      },
      {
        personId: 1,
        source: "tagged",
        owner: "10",
        photoId: "p1",
        faceId: "f2",
        descriptor: near,
      },
    ];

    const match = suggestPerson(near, refs, 0.6);
    expect(match?.personId).toBe(1);
    expect(match?.matchReference).toEqual({
      source: "tagged",
      owner: "10",
      photoId: "p1",
      faceId: "f2",
      personId: 1,
      externalEntityId: null,
    });
  });

  it("propagates matchReference through suggestPersonsForFaces", () => {
    const faces = [{ id: "f-new", descriptor: baseDescriptor, box: { x: 0, y: 0, w: 0.2, h: 0.2 } }];
    const refs = [
      {
        personId: 5,
        source: "avatar",
        descriptor: baseDescriptor,
      },
    ];
    const next = suggestPersonsForFaces(faces, refs, 0.6);
    expect(next[0].suggestedPersonId).toBe(5);
    expect(next[0].suggestedMatchReference?.source).toBe("avatar");
    expect(next[0].suggestedMatchReference?.personId).toBe(5);
  });
});