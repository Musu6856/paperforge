import test from "node:test";
import assert from "node:assert/strict";

import { landingSections } from "./landing-content.ts";

test("landing navigation targets have matching content sections", () => {
  const ids = new Set(landingSections.map((section) => section.id));

  assert.equal(ids.has("features"), true);
  assert.equal(ids.has("model-safety"), true);
  assert.equal(ids.has("docs"), true);
  assert.equal(ids.has("cases"), true);
});

test("landing sections contain useful product-facing content", () => {
  for (const section of landingSections) {
    assert.ok(section.title.length >= 2);
    assert.ok(section.description.length >= 12);
    assert.ok(section.items.length >= 2);
  }
});
