import { describe, expect, it } from 'vitest';
import { parseKnowledgeMarkdown } from '../../src/services/knowledge-parse';

const SAMPLE = `Last updated: 2026-10-16

# Payment

<!-- table: sample-payment-plan -->
| Milestone | % | Amount |
| :--- | ---: | :---: |
| Booking | 10 | 100 |
| Later | 90 | 900 |

> Note about the plan.

## Photos

![Sample floor plan](images/sample-floor-plan.webp)
`;

describe('parseKnowledgeMarkdown', () => {
  it('reads lastUpdated, table marker, alignment, notes, and image refs', () => {
    const parsed = parseKnowledgeMarkdown(SAMPLE);
    expect(parsed.lastUpdated).toBe('2026-10-16');
    expect(parsed.lastUpdatedLine).toBe(1);

    expect(parsed.tables).toHaveLength(1);
    const table = parsed.tables[0]!;
    expect(table.id).toBe('sample-payment-plan');
    expect(table.title).toBe('Payment');
    expect(table.hasTable).toBe(true);
    expect(table.columns.map((c) => c.align)).toEqual(['left', 'right', 'center']);
    expect(table.columns[0]).toEqual({ key: '0', label: 'Milestone', align: 'left' });
    expect(table.rows[0]).toEqual({ '0': 'Booking', '1': '10', '2': '100' });
    expect(table.notes).toBe('Note about the plan.');

    expect(parsed.images).toEqual([
      { name: 'sample-floor-plan', alt: 'Sample floor plan', line: 15 },
    ]);
  });

  it('flags invalid image names and missing tables after markers', () => {
    const parsed = parseKnowledgeMarkdown(`Last updated: 2026-01-01

<!-- table: broken -->

Not a table

![bad](images/Not_Valid.webp)
`);
    expect(parsed.tables[0]?.hasTable).toBe(false);
    expect(parsed.invalidImageRefs).toHaveLength(1);
    expect(parsed.images).toHaveLength(0);
  });
});
