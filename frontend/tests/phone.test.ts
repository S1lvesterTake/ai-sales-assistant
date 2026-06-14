import { normalizeIndonesianPhone } from "@/lib/validation/phone";

describe("normalizeIndonesianPhone", () => {
  it.each([
    ["0812 3456 7890", "6281234567890"],
    ["62812-3456-7890", "6281234567890"],
    ["+62 (812) 3456 7890", "6281234567890"],
  ])("normalizes %s to canonical storage format", (input, expected) => {
    expect(normalizeIndonesianPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "+62123", "0812ABC7890", "+62812345678901234"])(
    "rejects invalid input %s",
    (input) => {
      expect(normalizeIndonesianPhone(input)).toBeNull();
    },
  );
});
