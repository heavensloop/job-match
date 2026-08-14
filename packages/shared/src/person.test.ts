import { describe, expect, it } from "vitest";
import { PersonSchema } from "./person";

const validPerson = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  userId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  legalName: "Ada Lovelace",
  email: "ada@example.com",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("PersonSchema", () => {
  it("accepts a minimal valid person", () => {
    const result = PersonSchema.parse(validPerson);
    expect(result.legalName).toBe("Ada Lovelace");
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("accepts a fully populated person", () => {
    const result = PersonSchema.parse({
      ...validPerson,
      displayName: "Ada",
      phone: "+1-555-0100",
      address: "12 Mayfair, London, UK",
    });
    expect(result.displayName).toBe("Ada");
    expect(result.address).toBe("12 Mayfair, London, UK");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      PersonSchema.parse({ ...validPerson, email: "not-an-email" }),
    ).toThrow();
  });

  it("rejects a missing required field", () => {
    const { legalName: _legalName, ...withoutLegalName } = validPerson;
    expect(() => PersonSchema.parse(withoutLegalName)).toThrow();
  });
});
