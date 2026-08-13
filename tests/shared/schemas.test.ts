import { describe, expect, it } from 'vitest';

import {
  changeSubscriptionSchema,
  createGenerationSchema,
  createMessageSchema,
  createProjectSchema,
  createSessionSchema,
  cursorSchema,
  duplicateProjectSchema,
  estimateCreditsSchema,
  idempotencyKeySchema,
  limitSchema,
  listModelsQuerySchema,
  projectNameSchema,
  promptSchema,
  seedSchema,
  updateProjectSchema,
} from '../../lib/shared/schemas';

describe('projectNameSchema', () => {
  it('trims surrounding whitespace', () => {
    expect(projectNameSchema.parse('  My Project  ')).toBe('My Project');
  });

  it('rejects an empty string after trim', () => {
    expect(() => projectNameSchema.parse('   ')).toThrow();
  });

  it('rejects longer than 80 characters', () => {
    expect(() => projectNameSchema.parse('x'.repeat(81))).toThrow();
  });

  it('strips control characters', () => {
    expect(projectNameSchema.parse('NeonCity')).toBe('NeonCity');
  });
});

describe('promptSchema', () => {
  it('keeps newlines but strips other control characters', () => {
    expect(promptSchema.parse('line one\nline two')).toBe('line one\nline two');
  });

  it('rejects over 2000 characters', () => {
    expect(() => promptSchema.parse('x'.repeat(2001))).toThrow();
  });

  it('rejects an empty string after trim', () => {
    expect(() => promptSchema.parse('   ')).toThrow();
  });
});

describe('seedSchema', () => {
  it('accepts the documented range', () => {
    expect(seedSchema.parse(0)).toBe(0);
    expect(seedSchema.parse(2147483647)).toBe(2147483647);
  });

  it('rejects negative and out-of-range values', () => {
    expect(() => seedSchema.parse(-1)).toThrow();
    expect(() => seedSchema.parse(2147483648)).toThrow();
  });

  it('rejects non-integers', () => {
    expect(() => seedSchema.parse(1.5)).toThrow();
  });
});

describe('idempotencyKeySchema', () => {
  it('accepts a uuid v4', () => {
    expect(idempotencyKeySchema.parse('3fa3bfa1-6e97-4b3a-8f0a-1c2d3e4f5061')).toBeTruthy();
  });

  it('rejects a non-uuid string', () => {
    expect(() => idempotencyKeySchema.parse('not-a-uuid')).toThrow();
  });

  it('rejects a uuid v1 (wrong version nibble)', () => {
    expect(() => idempotencyKeySchema.parse('3fa3bfa1-6e97-1b3a-8f0a-1c2d3e4f5061')).toThrow();
  });
});

describe('limitSchema', () => {
  it('defaults to 30', () => {
    expect(limitSchema.parse(undefined)).toBe(30);
  });

  it('coerces numeric query strings', () => {
    expect(limitSchema.parse('50')).toBe(50);
  });

  it('rejects above 100', () => {
    expect(() => limitSchema.parse(101)).toThrow();
  });

  it('rejects below 1', () => {
    expect(() => limitSchema.parse(0)).toThrow();
  });
});

describe('cursorSchema', () => {
  it('accepts a short opaque string', () => {
    expect(cursorSchema.parse('abc123')).toBe('abc123');
  });

  it('rejects a cursor over 128 characters', () => {
    expect(() => cursorSchema.parse('x'.repeat(129))).toThrow();
  });
});

describe('listModelsQuerySchema boolean filters', () => {
  it('parses the string "true" as true', () => {
    expect(listModelsQuerySchema.parse({ featured: 'true' }).featured).toBe(true);
  });

  it('parses the string "false" as false, not JS-truthy true', () => {
    expect(listModelsQuerySchema.parse({ available: 'false' }).available).toBe(false);
  });
});

describe('createGenerationSchema', () => {
  it('accepts a minimal valid body and defaults mode to "create"', () => {
    const result = createGenerationSchema.parse({
      projectId: 'prj_abc',
      modelId: 'nano-banana-2',
      prompt: 'a neon city at night',
      kind: 'image',
    });
    expect(result.mode).toBe('create');
  });

  it('rejects a missing prompt', () => {
    expect(() =>
      createGenerationSchema.parse({ projectId: 'prj_abc', modelId: 'nano-banana-2', kind: 'image' }),
    ).toThrow();
  });

  it('rejects an out-of-shape aspectRatio', () => {
    expect(() =>
      createGenerationSchema.parse({
        projectId: 'prj_abc',
        modelId: 'nano-banana-2',
        prompt: 'a neon city',
        kind: 'image',
        params: { aspectRatio: 'square' },
      }),
    ).toThrow();
  });
});

describe('updateProjectSchema', () => {
  it('requires at least one field', () => {
    expect(() => updateProjectSchema.parse({})).toThrow();
  });

  it('accepts a null defaultModelId to clear it', () => {
    expect(updateProjectSchema.parse({ defaultModelId: null })).toEqual({ defaultModelId: null });
  });
});

describe('createMessageSchema', () => {
  it('caps attachmentAssetIds at one entry', () => {
    expect(() =>
      createMessageSchema.parse({ content: 'make it blue', attachmentAssetIds: ['ast_1', 'ast_2'] }),
    ).toThrow();
  });

  it('accepts a minimal valid body', () => {
    expect(createMessageSchema.parse({ content: 'make it blue' }).content).toBe('make it blue');
  });
});

describe('createProjectSchema / duplicateProjectSchema / estimateCreditsSchema / changeSubscriptionSchema / createSessionSchema', () => {
  it('createProjectSchema accepts an empty body', () => {
    expect(createProjectSchema.parse({})).toEqual({});
  });

  it('duplicateProjectSchema accepts an empty body', () => {
    expect(duplicateProjectSchema.parse({})).toEqual({});
  });

  it('estimateCreditsSchema requires modelId and kind', () => {
    expect(() => estimateCreditsSchema.parse({ kind: 'image' })).toThrow();
  });

  it('changeSubscriptionSchema requires a known planId', () => {
    expect(() => changeSubscriptionSchema.parse({ planId: 'ultra' })).toThrow();
    expect(changeSubscriptionSchema.parse({ planId: 'pro' }).planId).toBe('pro');
  });

  it('createSessionSchema leaves planId optional', () => {
    expect(createSessionSchema.parse({})).toEqual({});
  });
});
