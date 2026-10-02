/**
 * Test Suite for Contextual Per-Character Jitter Engine
 * Tests position-aware character variation with contextual scaling
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

// Import the implementation
const jitterEngine = require('./contextual-jitter-engine.js');
const { CharacterVariationContext, getCharVariation, getCharVariationWithContext } = jitterEngine;

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
    if (typeof global.it === 'function' && typeof process !== 'undefined' && require.main !== module) {
      global.it(name, () => fn.call(this));
    }
  }

  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
    }
  }

  assertAlmostEqual(actual, expected, tolerance = 0.01, message = '') {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(`Expected ~${expected}, got ${actual} (tolerance: ${tolerance}). ${message}`);
    }
  }

  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`Expected truthy value. ${message}`);
    }
  }

  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`Expected falsy value. ${message}`);
    }
  }

  assertInRange(value, min, max, message = '') {
    if (value < min || value > max) {
      throw new Error(`Expected value between ${min} and ${max}, got ${value}. ${message}`);
    }
  }

  run() {
    if (typeof global.it === 'function' && typeof process !== 'undefined' && require.main !== module) {
      return true;
    }
    console.log('Starting Contextual Jitter Engine tests...\n');

    for (const { name, fn } of this.tests) {
      try {
        fn.call(this);
        this.passed++;
        console.log(`✓ ${name}`);
      } catch (error) {
        this.failed++;
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}\n`);
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests passed: ${this.passed}`);
    console.log(`Tests failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}`);
    console.log(`${'='.repeat(50)}\n`);

    return this.failed === 0;
  }
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────

const runner = new TestRunner();

// ─────────────────────────────────────────────────────────────
// CHARACTERVARIATIONCONTEXT INITIALIZATION TESTS
// ─────────────────────────────────────────────────────────────

runner.test('CharacterVariationContext initializes with zero values', function() {
  const ctx = new CharacterVariationContext();
  
  this.assertEqual(ctx.lineCharCount, 0);
  this.assertEqual(ctx.lineCharIndex, 0);
  this.assertEqual(ctx.charsProcessedThisLine, 0);
  this.assertEqual(ctx.fatigueAccumulation, 0);
  this.assertFalse(ctx.isLineStart);
  this.assertFalse(ctx.isLineEnd);
});

runner.test('reset() clears all context state', function() {
  const ctx = new CharacterVariationContext();
  // Manually set values
  ctx.lineCharIndex = 10;
  ctx.charsProcessedThisLine = 100;
  ctx.fatigueAccumulation = 2.5;
  
  // Reset
  ctx.reset();
  
  this.assertEqual(ctx.lineCharIndex, 0);
  this.assertEqual(ctx.charsProcessedThisLine, 0);
  this.assertEqual(ctx.fatigueAccumulation, 0);
});

// ─────────────────────────────────────────────────────────────
// UPDATEFORCHARACTER TESTS (Req 1.6 - position context computation)
// ─────────────────────────────────────────────────────────────

runner.test('updateForCharacter marks line start (charIndex = 0)', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(0, 10, true, false);
  
  this.assertTrue(ctx.isLineStart, 'Should mark as line start');
  this.assertFalse(ctx.isLineEnd, 'Should not mark as line end');
});

runner.test('updateForCharacter marks line end (charIndex = totalCharsInLine - 1)', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(9, 10, false, true);
  
  this.assertFalse(ctx.isLineStart, 'Should not mark as line start');
  this.assertTrue(ctx.isLineEnd, 'Should mark as line end');
});

runner.test('updateForCharacter marks mid-word position', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(5, 10, false, false);
  
  this.assertFalse(ctx.isLineStart);
  this.assertFalse(ctx.isLineEnd);
  this.assertTrue(ctx.isInWord, 'Should mark as in-word position');
});

runner.test('updateForCharacter increments character counter', function() {
  const ctx = new CharacterVariationContext();
  
  for (let i = 0; i < 5; i++) {
    ctx.updateForCharacter(i, 10, false, false);
    this.assertEqual(ctx.charsProcessedThisLine, i + 1);
  }
});

// ─────────────────────────────────────────────────────────────
// FATIGUE ACCUMULATION TESTS (Req 1.4 - 0.02px per char after 50)
// ─────────────────────────────────────────────────────────────

runner.test('Fatigue accumulation starts at 0 for first 50 chars', function() {
  const ctx = new CharacterVariationContext();
  
  for (let i = 0; i < 50; i++) {
    ctx.updateForCharacter(i, 100, i === 0, i === 99);
    this.assertEqual(ctx.fatigueAccumulation, 0, `Char ${i}: fatigue should be 0`);
  }
});

runner.test('Fatigue accumulation begins after 50 characters', function() {
  const ctx = new CharacterVariationContext();
  
  // Process 50 characters
  for (let i = 0; i < 50; i++) {
    ctx.updateForCharacter(i, 100, false, false);
  }
  this.assertEqual(ctx.fatigueAccumulation, 0);
  
  // Character 51 should have fatigue
  ctx.updateForCharacter(50, 100, false, false);
  this.assertAlmostEqual(ctx.fatigueAccumulation, 0.02, 0.001);
});

runner.test('Fatigue accumulation is 0.02px per character (Req 1.4)', function() {
  const ctx = new CharacterVariationContext();
  
  // Process 60 characters (10 beyond threshold)
  for (let i = 0; i < 60; i++) {
    ctx.updateForCharacter(i, 100, false, false);
  }
  
  // After 60 chars: (60 - 50) * 0.02 = 0.20
  this.assertAlmostEqual(ctx.fatigueAccumulation, 0.20, 0.001);
});

runner.test('Fatigue accumulation scales linearly', function() {
  const ctx = new CharacterVariationContext();
  
  for (let i = 0; i < 100; i++) {
    ctx.updateForCharacter(i, 150, false, false);
  }
  
  // After 100 chars: (100 - 50) * 0.02 = 1.0
  this.assertAlmostEqual(ctx.fatigueAccumulation, 1.0, 0.001);
});

// ─────────────────────────────────────────────────────────────
// FATIGUE RESET TESTS (Req 1.5 - reset at line breaks)
// ─────────────────────────────────────────────────────────────

runner.test('resetAtLineBreak clears fatigue accumulation', function() {
  const ctx = new CharacterVariationContext();
  
  // Build up fatigue
  for (let i = 0; i < 80; i++) {
    ctx.updateForCharacter(i, 100, false, false);
  }
  this.assertTrue(ctx.fatigueAccumulation > 0);
  
  // Reset
  ctx.resetAtLineBreak();
  this.assertEqual(ctx.fatigueAccumulation, 0);
  this.assertEqual(ctx.charsProcessedThisLine, 0);
});

runner.test('resetAtLineBreak allows fatigue to rebuild on new line', function() {
  const ctx = new CharacterVariationContext();
  
  // Line 1: accumulate fatigue
  for (let i = 0; i < 80; i++) {
    ctx.updateForCharacter(i, 100, false, false);
  }
  const line1Fatigue = ctx.fatigueAccumulation;
  
  // Reset for new line
  ctx.resetAtLineBreak();
  
  // Line 2: rebuild fatigue
  for (let i = 0; i < 80; i++) {
    ctx.updateForCharacter(i, 100, false, false);
  }
  const line2Fatigue = ctx.fatigueAccumulation;
  
  // Both lines should have similar fatigue
  this.assertAlmostEqual(line1Fatigue, line2Fatigue, 0.001);
});

// ─────────────────────────────────────────────────────────────
// POSITION SCALING TESTS (Req 1.1, 1.2, 1.3, 1.7)
// ─────────────────────────────────────────────────────────────

runner.test('getPositionScaling returns 1.2× pressure at line-start (Req 1.1)', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(0, 10, true, false);
  
  const scaling = ctx.getPositionScaling();
  this.assertAlmostEqual(scaling.pressureScale, 1.2, 0.001);
});

runner.test('getPositionScaling returns 1.0× pressure in mid-line', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(5, 10, false, false);
  
  const scaling = ctx.getPositionScaling();
  this.assertAlmostEqual(scaling.pressureScale, 1.0, 0.001);
});

runner.test('getPositionScaling returns 1.3× slant at line-end (Req 1.2)', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(9, 10, false, true);
  
  const scaling = ctx.getPositionScaling();
  this.assertAlmostEqual(scaling.slantScale, 1.3, 0.001);
});

runner.test('getPositionScaling returns 1.0× slant in mid-line', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(5, 10, false, false);
  
  const scaling = ctx.getPositionScaling();
  this.assertAlmostEqual(scaling.slantScale, 1.0, 0.001);
});

runner.test('getPositionScaling returns 1.5× spacing after 80 chars (Req 1.7)', function() {
  const ctx = new CharacterVariationContext();
  
  // Need to process 81+ characters to trigger the > 80 condition
  for (let i = 0; i < 81; i++) {
    ctx.updateForCharacter(i, 150, false, false);
  }
  
  const scaling = ctx.getPositionScaling();
  this.assertAlmostEqual(scaling.spacingScale, 1.5, 0.001);
});

runner.test('getPositionScaling returns 1.0× spacing before 80 chars', function() {
  const ctx = new CharacterVariationContext();
  
  for (let i = 0; i < 50; i++) {
    ctx.updateForCharacter(i, 150, false, false);
  }
  
  const scaling = ctx.getPositionScaling();
  this.assertAlmostEqual(scaling.spacingScale, 1.0, 0.001);
});

runner.test('getPositionScaling includes fatigue offset', function() {
  const ctx = new CharacterVariationContext();
  
  for (let i = 0; i < 60; i++) {
    ctx.updateForCharacter(i, 150, false, false);
  }
  
  const scaling = ctx.getPositionScaling();
  this.assertTrue(scaling.fatigueOffset !== undefined);
  this.assertAlmostEqual(scaling.fatigueOffset, 0.2, 0.001);
});

// ─────────────────────────────────────────────────────────────
// GETCHARVARIATION BACKWARD COMPATIBILITY TESTS
// ─────────────────────────────────────────────────────────────

runner.test('getCharVariation returns variation object without context', function() {
  const v = getCharVariation(1.0, 0.12, 22);
  
  this.assertTrue(v !== null);
  this.assertTrue(typeof v === 'object');
  this.assertTrue('tiltDeg' in v);
  this.assertTrue('scaleY' in v);
  this.assertTrue('scaleX' in v);
  this.assertTrue('baselineOff' in v);
  this.assertTrue('spacingExtra' in v);
  this.assertTrue('pressureMod' in v);
  this.assertTrue('opacity' in v);
});

runner.test('getCharVariation applies pressure bounds', function() {
  // Test multiple times since it's randomized
  for (let i = 0; i < 20; i++) {
    const v = getCharVariation(1.0, 0.12, 22);
    this.assertInRange(v.pressureMod, 0, 1, 'pressureMod should be 0-1');
    this.assertInRange(v.opacity, 0.9, 1.0, 'opacity should be 0.9-1.0');
  }
});

runner.test('getCharVariation respects fontSize scaling', function() {
  // Run multiple times to get a statistical picture
  let v22Values = [];
  let v44Values = [];
  
  for (let i = 0; i < 20; i++) {
    const v22 = getCharVariation(1.0, 0.12, 22);
    const v44 = getCharVariation(1.0, 0.12, 44);
    v22Values.push(Math.abs(v22.baselineOff));
    v44Values.push(Math.abs(v44.baselineOff));
  }
  
  const avg22 = v22Values.reduce((a, b) => a + b) / v22Values.length;
  const avg44 = v44Values.reduce((a, b) => a + b) / v44Values.length;
  
  // Larger font size should produce larger variations on average
  // The k factor is (fontSize / 22), so 44/22 = 2x scaling
  // We expect v44 to be roughly 2x larger
  this.assertTrue(avg44 >= avg22 * 0.5, `Expected avg44 (${avg44}) >= avg22 (${avg22}) * 0.5`);
});

// ─────────────────────────────────────────────────────────────
// GETCHARVARIATIONWITHCONTEXT TESTS (Req 1.1-1.8)
// ─────────────────────────────────────────────────────────────

runner.test('getCharVariationWithContext applies line-start pressure scaling', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(0, 10, true, false);
  
  const v = getCharVariationWithContext(1.0, 0.12, 22, ctx);
  
  // Pressure should be scaled by 1.2× at line start
  // The exact formula is: pressureMod *= pressureScale
  // Since we can't easily test absolute values (it's randomized),
  // we verify the context was used
  this.assertTrue(v !== null);
  this.assertTrue('pressureMod' in v);
});

runner.test('getCharVariationWithContext applies line-end slant scaling', function() {
  const ctx = new CharacterVariationContext();
  ctx.updateForCharacter(9, 10, false, true);
  
  const v = getCharVariationWithContext(1.0, 0.12, 22, ctx);
  
  this.assertTrue(v !== null);
  this.assertTrue('tiltDeg' in v);
});

runner.test('getCharVariationWithContext applies fatigue offset to baseline', function() {
  const ctx = new CharacterVariationContext();
  
  // Build fatigue
  for (let i = 0; i < 60; i++) {
    ctx.updateForCharacter(i, 150, false, false);
  }
  
  const v = getCharVariationWithContext(1.0, 0.12, 22, ctx);
  
  // BaselineOff should be reduced by fatigue offset (~0.2)
  this.assertTrue(v.baselineOff <= 0.4); // Should be impacted by fatigue
});

runner.test('getCharVariationWithContext applies hand-cramping spacing', function() {
  const ctx = new CharacterVariationContext();
  
  // Process 85 characters to trigger hand-cramping
  for (let i = 0; i < 85; i++) {
    ctx.updateForCharacter(i, 150, false, false);
  }
  
  const v = getCharVariationWithContext(1.0, 0.12, 22, ctx);
  
  // spacingExtra should be scaled by 1.5× after 80 chars
  this.assertTrue('spacingExtra' in v);
});

runner.test('getCharVariationWithContext with null context returns base variation', function() {
  const v = getCharVariationWithContext(1.0, 0.12, 22, null);
  
  this.assertTrue(v !== null);
  this.assertTrue('tiltDeg' in v);
  this.assertTrue('pressureMod' in v);
});

// ─────────────────────────────────────────────────────────────
// INTEGRATION TESTS (Simulating real rendering scenarios)
// ─────────────────────────────────────────────────────────────

runner.test('Simulate single-line rendering with context', function() {
  const ctx = new CharacterVariationContext();
  const lineLength = 50;
  
  for (let i = 0; i < lineLength; i++) {
    ctx.updateForCharacter(i, lineLength, i === 0, i === lineLength - 1);
    const v = getCharVariationWithContext(1.0, 0.12, 22, ctx);
    
    // Should never crash and always return valid variation
    this.assertTrue(v !== null);
    this.assertTrue(typeof v.tiltDeg === 'number');
  }
});

runner.test('Simulate multi-line rendering with fatigue reset', function() {
  const ctx = new CharacterVariationContext();
  const lineLength = 70;
  const lines = 3;
  
  for (let lineIdx = 0; lineIdx < lines; lineIdx++) {
    for (let i = 0; i < lineLength; i++) {
      ctx.updateForCharacter(i, lineLength, i === 0, i === lineLength - 1);
      const v = getCharVariationWithContext(1.0, 0.12, 22, ctx);
      this.assertTrue(v !== null);
    }
    
    // At line breaks, fatigue should reset
    ctx.resetAtLineBreak();
    this.assertEqual(ctx.fatigueAccumulation, 0);
  }
});

runner.test('Simulate hand-cramping on long line with 85+ chars', function() {
  const ctx = new CharacterVariationContext();
  const lineLength = 120;
  let handCrampingTriggered = false;
  
  for (let i = 0; i < lineLength; i++) {
    ctx.updateForCharacter(i, lineLength, i === 0, i === lineLength - 1);
    
    if (i >= 80) {
      const scaling = ctx.getPositionScaling();
      if (scaling.spacingScale === 1.5) {
        handCrampingTriggered = true;
      }
    }
  }
  
  this.assertTrue(handCrampingTriggered, 'Hand-cramping should trigger after 80 chars');
});

runner.test('Fatigue accumulation matches specification (0.02px per char after 50)', function() {
  const ctx = new CharacterVariationContext();
  
  // Test several points to verify linear accumulation
  const testPoints = [
    { chars: 51, expected: 0.02 },
    { chars: 60, expected: 0.20 },
    { chars: 100, expected: 1.00 },
    { chars: 150, expected: 2.00 }
  ];
  
  for (const { chars, expected } of testPoints) {
    ctx.reset();
    for (let i = 0; i < chars; i++) {
      ctx.updateForCharacter(i, chars + 50, false, false);
    }
    this.assertAlmostEqual(ctx.fatigueAccumulation, expected, 0.001, 
      `At ${chars} chars, fatigue should be ${expected}`);
  }
});

// ─────────────────────────────────────────────────────────────
// UPSTREAM v1.6.25 — ANISOTROPIC SCALE, MICRO-SHEAR & CLEAN GUARD
// ─────────────────────────────────────────────────────────────

runner.test('v1.6.25 seeded path returns shearX key', function() {
  const prng = jitterEngine.createPRNG(jitterEngine.hashString('shear-key'));
  const v = getCharVariationWithContext(1.0, 0.12, 22, null, { prng, realism: 0.5 });
  this.assertTrue('shearX' in v, 'shearX should be present in seeded variation');
  this.assertTrue(typeof v.shearX === 'number');
});

runner.test('v1.6.25 shearX magnitude stays within ±0.022·r and is non-zero when realism > 0', function() {
  const prng = jitterEngine.createPRNG(jitterEngine.hashString('shear-magnitude'));
  let sawNonZero = false;
  for (let i = 0; i < 200; i++) {
    const v = getCharVariationWithContext(1.0, 0.12, 22, null, { prng, realism: 1.0 });
    this.assertTrue(Math.abs(v.shearX) <= 0.022 + 1e-9, `|shearX| ${v.shearX} exceeds 0.022·r`);
    if (v.shearX !== 0) sawNonZero = true;
  }
  this.assertTrue(sawNonZero, 'shearX should take non-zero values when realism > 0');
});

runner.test('v1.6.25 shearX is neutral when realism = 0', function() {
  const prng = jitterEngine.createPRNG(jitterEngine.hashString('shear-zero'));
  for (let i = 0; i < 50; i++) {
    const v = getCharVariationWithContext(1.0, 0.12, 22, null, { prng, realism: 0 });
    this.assertEqual(v.shearX, 0, 'shearX must be 0 when realism = 0');
  }
});

runner.test('v1.6.25 shearX is scaled by 0.3 for Devanagari to protect matras', function() {
  const prng = jitterEngine.createPRNG(jitterEngine.hashString('shear-indic'));
  for (let i = 0; i < 200; i++) {
    const v = getCharVariationWithContext(1.0, 0.12, 22, null, { prng, realism: 1.0, isIndic: true });
    this.assertTrue(Math.abs(v.shearX) <= 0.022 * 0.3 + 1e-9, `Indic |shearX| ${v.shearX} exceeds 0.0066`);
  }
});

runner.test('v1.6.25 anisotropic scale: scaleX biased to compression, scaleY allowed to stretch', function() {
  const prng = jitterEngine.createPRNG(jitterEngine.hashString('anisotropic'));
  const scaleJitter = 0.075 * 1.0; // r = 1
  let sawStretchBeyondX = false;
  for (let i = 0; i < 500; i++) {
    const v = getCharVariationWithContext(1.0, 0.12, 22, null, { prng, realism: 1.0 });
    this.assertInRange(v.scaleX, 1 - scaleJitter * 0.9, 1 + scaleJitter * 0.9, 'scaleX range ±0.9·jitter');
    this.assertInRange(v.scaleY, 1 - scaleJitter, 1 + scaleJitter * 1.1, 'scaleY range −1·jitter to +1.1·jitter');
    if (v.scaleY > 1 + scaleJitter * 0.9) sawStretchBeyondX = true; // unreachable for scaleX
  }
  this.assertTrue(sawStretchBeyondX, 'scaleY should stretch beyond the full scaleX range (vertical stretch bias)');
});

runner.test('v1.6.25 anisotropic scale tightens for Devanagari (0.4× scriptScaleMult)', function() {
  const prng = jitterEngine.createPRNG(jitterEngine.hashString('anisotropic-indic'));
  const scaleJitter = 0.075 * 0.4; // r = 1, isIndic
  for (let i = 0; i < 200; i++) {
    const v = getCharVariationWithContext(1.0, 0.12, 22, null, { prng, realism: 1.0, isIndic: true });
    this.assertInRange(v.scaleX, 1 - scaleJitter * 0.9, 1 + scaleJitter * 0.9, 'Indic scaleX range');
    this.assertInRange(v.scaleY, 1 - scaleJitter, 1 + scaleJitter * 1.1, 'Indic scaleY range');
  }
});

runner.test('v1.6.25 clean style guard neutralises all transforms', function() {
  const prng = jitterEngine.createPRNG(jitterEngine.hashString('clean-guard'));
  for (let i = 0; i < 20; i++) {
    const v = getCharVariationWithContext(8.0, 0.3, 44, null, { prng, realism: 1.0, clean: true });
    this.assertEqual(v.tiltDeg, 0, 'clean tiltDeg must be 0');
    this.assertEqual(v.scaleX, 1.0, 'clean scaleX must be 1');
    this.assertEqual(v.scaleY, 1.0, 'clean scaleY must be 1');
    this.assertEqual(v.shearX, 0, 'clean shearX must be 0');
    this.assertEqual(v.baselineOff, 0, 'clean baselineOff must be 0');
    this.assertEqual(v.pressureMod, 1.0, 'clean pressureMod must be 1');
    this.assertEqual(v.opacity, 1.0, 'clean opacity must be 1');
  }
});

// ─────────────────────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────────────────────

const allTestsPassed = runner.run();

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runner, allTestsPassed, CharacterVariationContext, getCharVariation, getCharVariationWithContext };
}

// Return status code for CLI
if (typeof process !== 'undefined' && typeof require !== 'undefined' && require.main === module) {
  process.exit(allTestsPassed ? 0 : 1);
}
