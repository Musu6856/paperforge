import test from "node:test";
import assert from "node:assert/strict";

import {
  groupSymbolRegistryForDisplay,
  normalizeSymbolDefinition,
  normalizeSymbolRegistry,
  validateSymbolGovernance,
} from "./symbol-governance.ts";

test("legacy buyer-position strings stay unsubscripted and infer consumer-side defaults", () => {
  const legacySymbols = [
    "x: 消费者在[0,1]线段上的位置",
  ];

  const normalized = normalizeSymbolRegistry(legacySymbols);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].symbol, "x");
  assert.equal(normalized[0].baseSymbol, "x");
  assert.equal(normalized[0].subscript, undefined);
  assert.equal(normalized[0].codeName, "x");
  assert.equal(normalized[0].role, "decision");
  assert.equal(normalized[0].side, "consumer");
  assert.equal(normalized[0].assumption, "in_[0,1]");
  assert.equal(normalized[0].recommended, true);
  assert.doesNotThrow(() => validateSymbolGovernance({ symbols: legacySymbols }));
});

test("canonical hotelling symbols normalize to canonical notation and stay recommended", () => {
  const normalized = normalizeSymbolRegistry(["n_A_B: 平台A买家份额"]);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].symbol, "n_A^B");
  assert.equal(normalized[0].baseSymbol, "n");
  assert.equal(normalized[0].subscript, "A");
  assert.equal(normalized[0].superscript, "B");
  assert.equal(normalized[0].codeName, "n_A_B");
  assert.equal(normalized[0].role, "demand");
  assert.equal(normalized[0].side, "consumer");
  assert.equal(normalized[0].recommended, true);
});

test("malformed or empty symbol entries fail safely", () => {
  assert.equal(normalizeSymbolDefinition({}), null);
  assert.deepEqual(normalizeSymbolRegistry([null, "", "  ", {}]), []);
});

test("display groups keep canonical notation and surface symbols that need attention", () => {
  const registry = groupSymbolRegistryForDisplay([
    "tau_A: A 平台佣金率",
    {
      id: "missing-meaning",
      symbol: "z",
      baseSymbol: "z",
      codeName: "z",
      name: "辅助参数",
      meaning: "",
      role: "parameter",
      side: "global",
      assumption: "",
      recommended: false,
    },
    "x: 消费者在[0,1]线段上的位置",
    "n_A_B: 平台A买家份额",
  ]);

  assert.equal(registry.totals.total, 4);
  assert.equal(registry.totals.recommended, 3);
  assert.equal(registry.totals.issueCount > 0, true);

  assert.deepEqual(
    registry.groups.map((group) => group.role),
    ["decision", "demand", "parameter"]
  );
  assert.equal(registry.groups[1].symbols[0].symbol.symbol, "n_A^B");
  assert.equal(registry.groups[2].symbols[0].symbol.id, "missing-meaning");
  assert.equal(registry.groups[2].symbols[0].issueCount, 1);
});
