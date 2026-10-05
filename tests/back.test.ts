import { expect, it } from "vitest";
import { topHandler } from "../src/components/back";

it("back closes the pop-up first, then the newest screen, then tabs", () => {
  const f = () => {};
  const tab = { level: 0, seq: 1, fn: f }, screen = { level: 1, seq: 2, fn: f }, screen2 = { level: 1, seq: 4, fn: f }, popup = { level: 2, seq: 3, fn: f };
  expect(topHandler([tab, screen, popup, screen2])).toBe(popup);
  expect(topHandler([tab, screen, screen2])).toBe(screen2);
  expect(topHandler([tab])).toBe(tab);
  expect(topHandler([])).toBeUndefined();
});
