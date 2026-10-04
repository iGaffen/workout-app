import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { z } from "zod";
import { PackSchema } from "../src/model/schema";

// Keeps docs/pack-schema.json in sync with the Zod schema. Set UPDATE_SCHEMA=1 to regenerate.
it("docs/pack-schema.json matches the code", () => {
  const json = JSON.stringify(z.toJSONSchema(PackSchema, { io: "input", unrepresentable: "any" }), null, 2) + "\n";
  if (process.env.UPDATE_SCHEMA) writeFileSync("docs/pack-schema.json", json);
  expect(readFileSync("docs/pack-schema.json", "utf8")).toBe(json);
});
