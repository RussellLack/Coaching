/**
 * Tests for the condition evaluator.
 *
 * Run with: vitest (or jest with minor adjustments).
 * These tests are the spec — adding a new feature to the grammar means
 * adding a test here first.
 */

import { describe, it, expect } from 'vitest'
import { evaluateCondition, ConditionError } from './evaluator'

describe('evaluateCondition — numeric comparisons', () => {
  it('handles >', () => {
    expect(evaluateCondition('x > 3', { x: 4 })).toBe(true)
    expect(evaluateCondition('x > 3', { x: 3 })).toBe(false)
    expect(evaluateCondition('x > 3', { x: 2 })).toBe(false)
  })

  it('handles >=', () => {
    expect(evaluateCondition('x >= 3', { x: 3 })).toBe(true)
    expect(evaluateCondition('x >= 3', { x: 2.99 })).toBe(false)
  })

  it('handles <', () => {
    expect(evaluateCondition('x < 5', { x: 4 })).toBe(true)
    expect(evaluateCondition('x < 5', { x: 5 })).toBe(false)
  })

  it('handles <=', () => {
    expect(evaluateCondition('x <= 5', { x: 5 })).toBe(true)
    expect(evaluateCondition('x <= 5', { x: 5.01 })).toBe(false)
  })

  it('handles == on numbers', () => {
    expect(evaluateCondition('x == 4', { x: 4 })).toBe(true)
    expect(evaluateCondition('x == 4', { x: 4.0 })).toBe(true)
    expect(evaluateCondition('x == 4', { x: 5 })).toBe(false)
  })

  it('handles != on numbers', () => {
    expect(evaluateCondition('x != 4', { x: 5 })).toBe(true)
    expect(evaluateCondition('x != 4', { x: 4 })).toBe(false)
  })

  it('handles decimal numbers', () => {
    expect(evaluateCondition('x >= 4.2', { x: 4.2 })).toBe(true)
    expect(evaluateCondition('x >= 4.2', { x: 4.19 })).toBe(false)
  })
})

describe('evaluateCondition — string comparisons', () => {
  it('handles == on strings', () => {
    expect(evaluateCondition('primary == "IM"', { primary: 'IM' })).toBe(true)
    expect(evaluateCondition('primary == "IM"', { primary: 'AM' })).toBe(false)
  })

  it('handles != on strings', () => {
    expect(evaluateCondition('primary != "IM"', { primary: 'AM' })).toBe(true)
  })

  it('accepts single-quoted strings interchangeably', () => {
    expect(evaluateCondition("primary == 'IM'", { primary: 'IM' })).toBe(true)
    expect(evaluateCondition("primary == 'AM'", { primary: 'IM' })).toBe(false)
    expect(evaluateCondition("primary != 'IM'", { primary: 'AM' })).toBe(true)
  })

  it('rejects ordering operators on strings', () => {
    expect(() => evaluateCondition('primary > "AM"', { primary: 'IM' })).toThrow(
      ConditionError
    )
  })
})

describe('evaluateCondition — logical operators', () => {
  it('handles &&', () => {
    expect(evaluateCondition('x > 1 && x < 5', { x: 3 })).toBe(true)
    expect(evaluateCondition('x > 1 && x < 5', { x: 0 })).toBe(false)
    expect(evaluateCondition('x > 1 && x < 5', { x: 6 })).toBe(false)
  })

  it('handles ||', () => {
    expect(evaluateCondition('x < 1 || x > 5', { x: 0 })).toBe(true)
    expect(evaluateCondition('x < 1 || x > 5', { x: 6 })).toBe(true)
    expect(evaluateCondition('x < 1 || x > 5', { x: 3 })).toBe(false)
  })

  it('respects precedence: && binds tighter than ||', () => {
    // a || b && c  ≡  a || (b && c)
    expect(
      evaluateCondition('x == 1 || y == 2 && z == 3', { x: 1, y: 99, z: 99 })
    ).toBe(true)
    expect(
      evaluateCondition('x == 1 || y == 2 && z == 3', { x: 99, y: 2, z: 3 })
    ).toBe(true)
    expect(
      evaluateCondition('x == 1 || y == 2 && z == 3', { x: 99, y: 2, z: 99 })
    ).toBe(false) // y==2 true, z==3 false → false; OR with x==1 false → false
  })

  it('handles parentheses overriding precedence', () => {
    expect(
      evaluateCondition('(x == 1 || y == 2) && z == 3', { x: 1, y: 99, z: 3 })
    ).toBe(true)
    expect(
      evaluateCondition('(x == 1 || y == 2) && z == 3', { x: 1, y: 99, z: 99 })
    ).toBe(false)
  })
})

describe('evaluateCondition — membership (in)', () => {
  it('handles strings in lists', () => {
    expect(
      evaluateCondition('primary in ["IM", "AM"]', { primary: 'IM' })
    ).toBe(true)
    expect(
      evaluateCondition('primary in ["IM", "AM"]', { primary: 'IS' })
    ).toBe(false)
  })

  it('handles numbers in lists', () => {
    expect(evaluateCondition('x in [1, 2, 3]', { x: 2 })).toBe(true)
    expect(evaluateCondition('x in [1, 2, 3]', { x: 4 })).toBe(false)
  })

  it('handles empty list', () => {
    expect(evaluateCondition('x in []', { x: 1 })).toBe(false)
  })

  it('handles mixed-type lists', () => {
    expect(evaluateCondition('x in [1, "two", 3]', { x: 'two' })).toBe(true)
  })
})

describe('evaluateCondition — real assessment conditions', () => {
  // These are the exact conditions from the Assessment 1 spec
  it('matches "Ready" tier', () => {
    expect(evaluateCondition('overall >= 4.2', { overall: 4.5 })).toBe(true)
    expect(evaluateCondition('overall >= 4.2', { overall: 4.19 })).toBe(false)
  })

  it('matches "Ready, with one gap" tier', () => {
    const ctx = { overall: 3.7 }
    expect(evaluateCondition('overall >= 3.4 && overall < 4.2', ctx)).toBe(true)
    expect(
      evaluateCondition('overall >= 3.4 && overall < 4.2', { overall: 4.2 })
    ).toBe(false)
    expect(
      evaluateCondition('overall >= 3.4 && overall < 4.2', { overall: 3.39 })
    ).toBe(false)
  })

  it('matches "Almost ready" tier', () => {
    expect(evaluateCondition('overall >= 2.6 && overall < 3.4', { overall: 3.0 })).toBe(true)
  })

  it('matches "Not yet" tier', () => {
    expect(evaluateCondition('overall < 2.6', { overall: 2.0 })).toBe(true)
    expect(evaluateCondition('overall < 2.6', { overall: 2.6 })).toBe(false)
  })

  it('handles compound tier conditions for assessment 3', () => {
    expect(
      evaluateCondition(
        'primary_tag == "IM" && ai_band == "leaning"',
        { primary_tag: 'IM', ai_band: 'leaning' }
      )
    ).toBe(true)
  })
})

describe('evaluateCondition — error handling', () => {
  it('throws on empty expression', () => {
    expect(() => evaluateCondition('', {})).toThrow(ConditionError)
    expect(() => evaluateCondition('   ', {})).toThrow(ConditionError)
  })

  it('throws on unknown variable', () => {
    expect(() => evaluateCondition('missing >= 1', {})).toThrow(/Unknown variable/)
  })

  it('throws on malformed expression', () => {
    expect(() => evaluateCondition('x >', { x: 1 })).toThrow(ConditionError)
    expect(() => evaluateCondition('&&', { x: 1 })).toThrow(ConditionError)
    expect(() => evaluateCondition('x == ', { x: 1 })).toThrow(ConditionError)
  })

  it('throws on unterminated string', () => {
    expect(() => evaluateCondition('x == "unclosed', { x: 'foo' })).toThrow(
      /Unterminated string/
    )
  })

  it('throws on unexpected character', () => {
    expect(() => evaluateCondition('x @ 1', { x: 1 })).toThrow(/Unexpected character/)
  })

  it('throws on trailing tokens', () => {
    expect(() => evaluateCondition('x == 1 extra', { x: 1 })).toThrow(/Unexpected token/)
  })

  it('throws when expression does not evaluate to boolean', () => {
    // `x` alone is a number, not a boolean
    expect(() => evaluateCondition('x', { x: 1 })).toThrow(/must evaluate to a boolean/)
  })
})

describe('evaluateCondition — security', () => {
  it('does not execute arbitrary JavaScript via constructor', () => {
    expect(() =>
      evaluateCondition('constructor.constructor("return process")()', {})
    ).toThrow(ConditionError)
  })

  it('does not allow function calls', () => {
    expect(() => evaluateCondition('Math.max(1, 2) > 0', {})).toThrow(ConditionError)
  })

  it('does not allow arithmetic', () => {
    // `+` is not in the grammar — should fail at the comparison level
    expect(() => evaluateCondition('x + 1 > 2', { x: 2 })).toThrow(ConditionError)
  })
})
