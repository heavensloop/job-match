import { describe, expect, it } from "vitest";
import { renderCircleIcon } from "./icon-image";

const BLUE = { r: 37, g: 99, b: 235 };

describe("renderCircleIcon", () => {
  it("produces an RGBA buffer of the right size", () => {
    const data = renderCircleIcon(16, BLUE);
    expect(data).toHaveLength(16 * 16 * 4);
  });

  it("fills the center pixel with the given color, fully opaque", () => {
    const size = 16;
    const data = renderCircleIcon(size, BLUE);
    const center = Math.floor(size / 2);
    const i = (center * size + center) * 4;

    expect(data[i]).toBe(BLUE.r);
    expect(data[i + 1]).toBe(BLUE.g);
    expect(data[i + 2]).toBe(BLUE.b);
    expect(data[i + 3]).toBe(255);
  });

  it("leaves the corner pixels transparent", () => {
    const size = 16;
    const data = renderCircleIcon(size, BLUE);
    const corners = [0, size - 1, size * (size - 1), size * size - 1];

    for (const pixelIndex of corners) {
      expect(data[pixelIndex * 4 + 3]).toBe(0);
    }
  });
});
