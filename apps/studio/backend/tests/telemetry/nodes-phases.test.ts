import { describe, expect, it } from 'vitest';
import {
  applyRunEvent,
  closeOpenNode,
  createNodeTracker,
} from '../../src/telemetry/nodes.js';
import { computePhases, phaseForClass } from '../../src/telemetry/phases.js';

describe('node durations', () => {
  it('measures from consecutive starts and closes the last node at runEnd', () => {
    const tracker = createNodeTracker();
    const t0 = new Date(1000);
    const t1 = new Date(1500);
    const t2 = new Date(4000);
    const end = new Date(4500);

    applyRunEvent(tracker, {
      type: 'node_start',
      nodeId: 'a',
      nodeClass: 'UNETLoader',
      at: t0,
    });
    applyRunEvent(tracker, {
      type: 'node_start',
      nodeId: 'b',
      nodeClass: 'KSampler',
      at: t1,
    });
    applyRunEvent(tracker, {
      type: 'node_start',
      nodeId: 'c',
      nodeClass: 'VAEDecode',
      at: t2,
    });
    closeOpenNode(tracker, end);

    expect(tracker.nodes).toEqual([
      { nodeId: 'a', class: 'UNETLoader', ms: 500, cached: false },
      { nodeId: 'b', class: 'KSampler', ms: 2500, cached: false },
      { nodeId: 'c', class: 'VAEDecode', ms: 500, cached: false },
    ]);
  });

  it('records cached nodes as 0 ms with class and title', () => {
    const tracker = createNodeTracker();
    applyRunEvent(tracker, {
      type: 'nodes_cached',
      nodes: [
        { nodeId: '1', nodeClass: 'CLIPLoader', nodeTitle: 'Load CLIP' },
        { nodeId: '2', nodeClass: 'VAELoader' },
      ],
      at: new Date(0),
    });
    expect(tracker.nodes).toEqual([
      {
        nodeId: '1',
        class: 'CLIPLoader',
        title: 'Load CLIP',
        ms: 0,
        cached: true,
      },
      { nodeId: '2', class: 'VAELoader', ms: 0, cached: true },
    ]);
  });
});

describe('phase grouping', () => {
  it('maps classes with first-match-wins rules', () => {
    expect(phaseForClass('CheckpointLoaderSimple')).toBe('loadMs');
    expect(phaseForClass('KSampler')).toBe('sampleMs');
    expect(phaseForClass('VAEDecode')).toBe('decodeMs');
    expect(phaseForClass('SaveImage')).toBe('otherMs');
  });

  it('sums durations into phase buckets', () => {
    expect(
      computePhases([
        { nodeId: '1', class: 'UNETLoader', ms: 100, cached: false },
        { nodeId: '2', class: 'KSampler', ms: 800, cached: false },
        { nodeId: '3', class: 'VAEDecode', ms: 50, cached: false },
        { nodeId: '4', class: 'SaveImage', ms: 10, cached: false },
        { nodeId: '5', class: '', ms: 0, cached: true },
      ]),
    ).toEqual({ loadMs: 100, sampleMs: 800, decodeMs: 50, otherMs: 10 });
  });
});
