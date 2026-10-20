import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppError, ErrorCodes } from '../../src/lib/errors';
import { createKnowledgeStore } from '../../src/services/knowledge.service';
import { validateProjectPack } from '../../src/services/knowledge-validate';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function makePack(
  knowledgeMd: string,
  options?: { systemMd?: string; withImage?: boolean },
): Promise<{ root: string; projectDir: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-'));
  tempDirs.push(root);
  const projectDir = path.join(root, 'demo');
  await fs.mkdir(path.join(projectDir, 'images'), { recursive: true });
  await fs.writeFile(
    path.join(projectDir, 'system.md'),
    options?.systemMd ?? 'You are helpful.\n',
    'utf8',
  );
  await fs.writeFile(path.join(projectDir, 'knowledge.md'), knowledgeMd, 'utf8');
  if (options?.withImage !== false) {
    await fs.writeFile(path.join(projectDir, 'images', 'sample-floor-plan.webp'), 'x');
    await fs.writeFile(
      path.join(projectDir, 'images', 'sample-floor-plan.thumb.webp'),
      'x',
    );
  }
  return { root, projectDir };
}

const VALID_MD = `Last updated: 2026-10-16

# Section

<!-- table: payment-plan -->
| A | B |
| --- | --- |
| 1 | 2 |

![Sample](images/sample-floor-plan.webp)
`;

describe('validateProjectPack', () => {
  it('accepts a valid pack', async () => {
    const { projectDir } = await makePack(VALID_MD);
    const result = await validateProjectPack('demo', projectDir);
    expect(result.ok).toBe(true);
    expect(result.stats.tables).toBe(1);
    expect(result.stats.images).toBe(1);
  });

  it('errors when lastUpdated is missing', async () => {
    const { projectDir } = await makePack('# No date\n');
    const result = await validateProjectPack('demo', projectDir);
    expect(result.errors.some((e) => e.message.includes('Last updated'))).toBe(true);
  });

  it('errors on duplicate table ids', async () => {
    const md = `Last updated: 2026-10-16

<!-- table: same-id -->
| A |
| --- |
| 1 |

<!-- table: same-id -->
| B |
| --- |
| 2 |
`;
    const { projectDir } = await makePack(md, { withImage: false });
    const result = await validateProjectPack('demo', projectDir);
    expect(result.errors.some((e) => e.message.includes('Duplicate table id'))).toBe(
      true,
    );
  });

  it('errors when marker has no table', async () => {
    const md = `Last updated: 2026-10-16

<!-- table: lonely -->

Text
`;
    const { projectDir } = await makePack(md, { withImage: false });
    const result = await validateProjectPack('demo', projectDir);
    expect(
      result.errors.some((e) => e.message.includes('not immediately followed')),
    ).toBe(true);
  });

  it('errors when row cell count differs from header', async () => {
    const md = `Last updated: 2026-10-16

<!-- table: bad-row -->
| A | B |
| --- | --- |
| only-one |
`;
    const { projectDir } = await makePack(md, { withImage: false });
    const result = await validateProjectPack('demo', projectDir);
    expect(result.errors.some((e) => e.message.includes('cells'))).toBe(true);
  });

  it('errors when image or thumb is missing', async () => {
    const { projectDir } = await makePack(VALID_MD, { withImage: false });
    const result = await validateProjectPack('demo', projectDir);
    expect(result.errors.some((e) => e.message.includes('Missing image file'))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.message.includes('Missing thumbnail'))).toBe(
      true,
    );
  });

  it('errors on invalid image names', async () => {
    const md = `Last updated: 2026-10-16

![x](images/Bad_Name.webp)
`;
    const { projectDir } = await makePack(md, { withImage: false });
    const result = await validateProjectPack('demo', projectDir);
    expect(result.errors.some((e) => e.message.includes('Invalid image name'))).toBe(
      true,
    );
  });

  it('warns when the same image is referenced twice', async () => {
    const md = `Last updated: 2026-10-16

![a](images/sample-floor-plan.webp)
![b](images/sample-floor-plan.webp)
`;
    const { projectDir } = await makePack(md);
    const result = await validateProjectPack('demo', projectDir);
    expect(result.ok).toBe(true);
    expect(
      result.warnings.some((w) => w.message.includes('referenced more than once')),
    ).toBe(true);
  });
});

describe('knowledge reload', () => {
  it('keeps the previous pack in memory when reload validation fails', async () => {
    const { root, projectDir } = await makePack(VALID_MD);
    const store = createKnowledgeStore(root);
    await store.loadAll();
    expect(store.getProject('demo').lastUpdated).toBe('2026-10-16');

    await fs.writeFile(path.join(projectDir, 'knowledge.md'), '# broken\n', 'utf8');

    await expect(store.reload()).rejects.toMatchObject({
      statusCode: 422,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>);

    expect(store.getProject('demo').lastUpdated).toBe('2026-10-16');
    expect(store.getProject('demo').knowledgeMd).toContain('payment-plan');
  });
});
