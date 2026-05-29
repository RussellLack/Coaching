/**
 * Condition evaluator for result-tier expressions.
 *
 * Supports a deliberately small expression language:
 *   - Numeric comparison: >, >=, <, <=, ==, !=
 *   - Logical operators: &&, ||
 *   - Membership: `x in [a, b, c]`
 *   - Parentheses for grouping
 *   - Variables (identifiers) and literals (numbers, strings, arrays)
 *
 * Examples that parse and evaluate correctly:
 *   overall >= 4.2
 *   overall >= 3.4 && overall < 4.2
 *   primary_tag == "IM"
 *   primary_tag in ["IM", "AM"]
 *   (overall >= 4 && currency >= 3) || healthy_count >= 9
 *
 * NOT supported (deliberately):
 *   - Function calls
 *   - Arithmetic (+ - * /)
 *   - Property access (foo.bar)
 *   - Unary minus on identifiers (use literal negative numbers in conditions)
 *
 * Anything more complex than this should be a new scoring strategy, not a
 * more elaborate condition language.
 *
 * Implementation: hand-written recursive-descent parser. No eval, no Function
 * constructor, no third-party deps. Safe to run against any input.
 */

type ConditionValue = number | string | boolean | Array<number | string>
export type ConditionContext = Record<string, number | string>

// ── TOKENISER ─────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENT'
  | 'OP' // >, >=, <, <=, ==, !=, &&, ||
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'IN'

interface Token {
  type: TokenType
  value: string
  pos: number
}

function tokenise(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const c = input[i]

    // Whitespace
    if (/\s/.test(c)) {
      i++
      continue
    }

    // Numbers (including decimals)
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j++
      tokens.push({ type: 'NUMBER', value: input.slice(i, j), pos: i })
      i = j
      continue
    }

    // Strings (single- or double-quoted)
    if (c === '"' || c === "'") {
      const quote = c
      let j = i + 1
      let value = ''
      while (j < input.length && input[j] !== quote) {
        // Support escaped quote of the same kind
        if (input[j] === '\\' && input[j + 1] === quote) {
          value += quote
          j += 2
          continue
        }
        value += input[j]
        j++
      }
      if (j >= input.length) {
        throw new ConditionError(`Unterminated string starting at position ${i}`, i)
      }
      tokens.push({ type: 'STRING', value, pos: i })
      i = j + 1
      continue
    }

    // Identifiers and `in` keyword
    if (/[a-zA-Z_]/.test(c)) {
      let j = i
      while (j < input.length && /[a-zA-Z0-9_]/.test(input[j])) j++
      const ident = input.slice(i, j)
      if (ident === 'in') {
        tokens.push({ type: 'IN', value: ident, pos: i })
      } else {
        tokens.push({ type: 'IDENT', value: ident, pos: i })
      }
      i = j
      continue
    }

    // Two-character operators
    const two = input.slice(i, i + 2)
    if (two === '>=' || two === '<=' || two === '==' || two === '!=' || two === '&&' || two === '||') {
      tokens.push({ type: 'OP', value: two, pos: i })
      i += 2
      continue
    }

    // Single-character operators and punctuation
    if (c === '>' || c === '<') {
      tokens.push({ type: 'OP', value: c, pos: i })
      i++
      continue
    }
    if (c === '(') {
      tokens.push({ type: 'LPAREN', value: c, pos: i })
      i++
      continue
    }
    if (c === ')') {
      tokens.push({ type: 'RPAREN', value: c, pos: i })
      i++
      continue
    }
    if (c === '[') {
      tokens.push({ type: 'LBRACKET', value: c, pos: i })
      i++
      continue
    }
    if (c === ']') {
      tokens.push({ type: 'RBRACKET', value: c, pos: i })
      i++
      continue
    }
    if (c === ',') {
      tokens.push({ type: 'COMMA', value: c, pos: i })
      i++
      continue
    }

    throw new ConditionError(`Unexpected character '${c}' at position ${i}`, i)
  }

  return tokens
}

// ── PARSER ────────────────────────────────────────────────────────────────

class ConditionError extends Error {
  constructor(message: string, public readonly position?: number) {
    super(message)
    this.name = 'ConditionError'
  }
}

class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[], private readonly source: string) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private consume(): Token {
    const t = this.tokens[this.pos]
    if (!t) {
      throw new ConditionError(`Unexpected end of expression in "${this.source}"`)
    }
    this.pos++
    return t
  }

  private expect(type: TokenType, value?: string): Token {
    const t = this.consume()
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new ConditionError(
        `Expected ${value ?? type} but got '${t.value}' at position ${t.pos}`,
        t.pos
      )
    }
    return t
  }

  parse(ctx: ConditionContext): boolean {
    const result = this.parseOr(ctx)
    if (this.pos < this.tokens.length) {
      const next = this.tokens[this.pos]
      throw new ConditionError(
        `Unexpected token '${next.value}' at position ${next.pos}`,
        next.pos
      )
    }
    if (typeof result !== 'boolean') {
      throw new ConditionError(
        `Expression must evaluate to a boolean, got ${typeof result}`
      )
    }
    return result
  }

  // OR has lowest precedence
  private parseOr(ctx: ConditionContext): ConditionValue {
    let left = this.parseAnd(ctx)
    while (this.peek()?.type === 'OP' && this.peek()?.value === '||') {
      this.consume()
      const right = this.parseAnd(ctx)
      left = Boolean(left) || Boolean(right)
    }
    return left
  }

  private parseAnd(ctx: ConditionContext): ConditionValue {
    let left = this.parseComparison(ctx)
    while (this.peek()?.type === 'OP' && this.peek()?.value === '&&') {
      this.consume()
      const right = this.parseComparison(ctx)
      left = Boolean(left) && Boolean(right)
    }
    return left
  }

  private parseComparison(ctx: ConditionContext): ConditionValue {
    const left = this.parsePrimary(ctx)

    const next = this.peek()
    if (!next) return left

    // Membership: x in [a, b, c]
    if (next.type === 'IN') {
      this.consume()
      const list = this.parseList(ctx)
      return list.some((item) => item === left)
    }

    // Comparison operators
    if (
      next.type === 'OP' &&
      ['>', '>=', '<', '<=', '==', '!='].includes(next.value)
    ) {
      this.consume()
      const right = this.parsePrimary(ctx)
      return compare(left, right, next.value, next.pos)
    }

    return left
  }

  private parsePrimary(ctx: ConditionContext): ConditionValue {
    const t = this.peek()
    if (!t) throw new ConditionError('Unexpected end of expression')

    if (t.type === 'LPAREN') {
      this.consume()
      const inner = this.parseOr(ctx)
      this.expect('RPAREN')
      return inner
    }

    if (t.type === 'NUMBER') {
      this.consume()
      const n = parseFloat(t.value)
      if (Number.isNaN(n)) {
        throw new ConditionError(`Invalid number '${t.value}' at position ${t.pos}`, t.pos)
      }
      return n
    }

    if (t.type === 'STRING') {
      this.consume()
      return t.value
    }

    if (t.type === 'IDENT') {
      this.consume()
      if (!(t.value in ctx)) {
        throw new ConditionError(
          `Unknown variable '${t.value}' at position ${t.pos}`,
          t.pos
        )
      }
      return ctx[t.value]
    }

    if (t.type === 'LBRACKET') {
      return this.parseList(ctx)
    }

    throw new ConditionError(
      `Unexpected token '${t.value}' at position ${t.pos}`,
      t.pos
    )
  }

  private parseList(ctx: ConditionContext): Array<number | string> {
    this.expect('LBRACKET')
    const items: Array<number | string> = []

    if (this.peek()?.type === 'RBRACKET') {
      this.consume()
      return items
    }

    items.push(this.parseListItem(ctx))
    while (this.peek()?.type === 'COMMA') {
      this.consume()
      items.push(this.parseListItem(ctx))
    }
    this.expect('RBRACKET')
    return items
  }

  private parseListItem(ctx: ConditionContext): number | string {
    const t = this.consume()
    if (t.type === 'NUMBER') return parseFloat(t.value)
    if (t.type === 'STRING') return t.value
    if (t.type === 'IDENT') {
      if (!(t.value in ctx)) {
        throw new ConditionError(
          `Unknown variable '${t.value}' at position ${t.pos}`,
          t.pos
        )
      }
      const v = ctx[t.value]
      if (typeof v !== 'number' && typeof v !== 'string') {
        throw new ConditionError(
          `Variable '${t.value}' must be a number or string when used in a list`,
          t.pos
        )
      }
      return v
    }
    throw new ConditionError(
      `Expected number, string, or identifier in list at position ${t.pos}`,
      t.pos
    )
  }
}

// ── COMPARISON HELPER ─────────────────────────────────────────────────────

function compare(left: ConditionValue, right: ConditionValue, op: string, pos: number): boolean {
  // Equality works for both numbers and strings
  if (op === '==') return left === right
  if (op === '!=') return left !== right

  // Ordering only valid for numbers
  if (typeof left !== 'number' || typeof right !== 'number') {
    throw new ConditionError(
      `Operator '${op}' requires numeric operands (got ${typeof left} and ${typeof right}) at position ${pos}`,
      pos
    )
  }

  switch (op) {
    case '>':
      return left > right
    case '>=':
      return left >= right
    case '<':
      return left < right
    case '<=':
      return left <= right
    default:
      throw new ConditionError(`Unknown operator '${op}'`, pos)
  }
}

// ── PUBLIC API ────────────────────────────────────────────────────────────

/**
 * Evaluate a condition string against a context.
 *
 * @example
 *   evaluateCondition("overall >= 4.2", { overall: 4.5 }) // → true
 *   evaluateCondition("primary == 'IM'", { primary: 'IM' }) // → true
 *   evaluateCondition("x in [1, 2, 3]", { x: 2 }) // → true
 *
 * @throws {ConditionError} If the expression is malformed or references an unknown variable.
 */
export function evaluateCondition(expression: string, context: ConditionContext): boolean {
  if (!expression || expression.trim() === '') {
    throw new ConditionError('Empty condition expression')
  }
  const tokens = tokenise(expression)
  const parser = new Parser(tokens, expression)
  return parser.parse(context)
}

export { ConditionError }
