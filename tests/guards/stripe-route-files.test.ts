import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Stripe route files', () => {
  it('keeps the App Router webhook endpoint present for Vercel', () => {
    const routePath = path.join(root, 'app', 'api', 'stripe', 'webhook', 'route.ts');
    const source = fs.readFileSync(routePath, 'utf8');

    expect(source).toContain("export const runtime = 'nodejs'");
    expect(source).toContain("export const dynamic = 'force-dynamic'");
    expect(source).toMatch(/export\s+async\s+function\s+POST\s*\(/);
  });

  it('keeps the Stripe checkout endpoint present for pricing buttons', () => {
    const routePath = path.join(root, 'app', 'api', 'stripe', 'checkout', 'route.ts');
    const source = fs.readFileSync(routePath, 'utf8');

    expect(source).toContain("export const runtime = 'nodejs'");
    expect(source).toContain("export const dynamic = 'force-dynamic'");
    expect(source).toMatch(/export\s+async\s+function\s+POST\s*\(/);
  });
});
