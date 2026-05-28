import type { NextConfig } from "next"

/**
 * Page extensions for Next.js route detection.
 *
 * Default is ["tsx", "ts", "jsx", "js", "mdx"]. We replace each with a
 * negative lookbehind that prevents files ending in `.test.<ext>` from
 * being treated as routes or pulled into the production build. This
 * matters because tests import `vitest` (a dev-only dependency); without
 * the exclusion, `next build` would try to compile them and fail.
 *
 * The test files still ship in the repo — they document intent and run
 * locally once vitest is installed — but they don't reach production.
 *
 * Follow-up: add vitest as a devDependency and a `"test": "vitest"`
 * script so future commits can verify before push. Tracked in
 * CHANGES.md.
 */
const excludeTestFiles = (exts: string[]): string[] =>
  exts.map((ext) => `(?<!\\.test\\.)${ext}`)

const nextConfig: NextConfig = {
  pageExtensions: excludeTestFiles(["tsx", "ts", "jsx", "js"]),
}

export default nextConfig
