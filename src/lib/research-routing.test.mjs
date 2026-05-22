import test from "node:test";
import assert from "node:assert/strict";
import { getResearchIndexDestination } from "./research-routing.ts";

test("research index opens the newest project when records exist", () => {
  const destination = getResearchIndexDestination([
    { id: "project-newer" },
    { id: "project-older" },
  ]);

  assert.equal(destination, "/research/project-newer");
});

test("research index stays on the workspace when no records exist", () => {
  const destination = getResearchIndexDestination([]);

  assert.equal(destination, null);
});
