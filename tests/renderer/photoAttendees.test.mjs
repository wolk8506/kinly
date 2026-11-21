import { describe, expect, it } from "vitest";
import {
  addAttendeeToPhoto,
  removeAttendeeFromPhoto,
} from "../../src/utils/photoFaces.js";

describe("photo attendees", () => {
  it("removeAttendeeFromPhoto unlabels faces and drops id", () => {
    const next = removeAttendeeFromPhoto(
      {
        people: [60001, 40003],
        externalPeople: ["E1"],
        faces: [
          { id: "f1", personId: 60001, box: { x: 0, y: 0, w: 0.1, h: 0.1 } },
          { id: "f2", externalEntityId: "E1", box: { x: 0.1, y: 0, w: 0.1, h: 0.1 } },
        ],
      },
      { kind: "person", id: 60001 },
    );

    expect(next.people).toEqual([40003]);
    expect(next.faces[0].personId).toBeNull();
    expect(next.faces[0].box.w).toBe(0.1);
    expect(next.externalPeople).toEqual(["E1"]);
    expect(next.faces[1].externalEntityId).toBe("E1");
  });

  it("addAttendeeToPhoto appends without duplicates", () => {
    const next = addAttendeeToPhoto(
      { people: [1], externalPeople: [], faces: [] },
      { kind: "person", id: 2 },
    );
    expect(next.people).toEqual([1, 2]);

    const again = addAttendeeToPhoto(next, { kind: "person", id: 2 });
    expect(again.people).toEqual([1, 2]);
  });
});