import { describe, expect, it } from 'vitest';
import {
  attachmentsReducer,
  createAttachmentsState,
  readyAssetIds,
} from './reducer';

describe('attachmentsReducer', () => {
  it('enforces max on add', () => {
    let state = createAttachmentsState();
    state = attachmentsReducer(state, {
      type: 'add',
      max: 1,
      item: { key: 'a', previewUrl: 'x', uploading: false, assetId: '1' },
    });
    state = attachmentsReducer(state, {
      type: 'add',
      max: 1,
      item: { key: 'b', previewUrl: 'y', uploading: false, assetId: '2' },
    });
    expect(state.items).toHaveLength(1);
  });

  it('removes and marks working dismiss', () => {
    let state = attachmentsReducer(createAttachmentsState(), {
      type: 'hydrate',
      dismissedWorking: false,
      items: [
        {
          key: 'w',
          assetId: '1',
          previewUrl: 'p',
          uploading: false,
          working: true,
        },
      ],
    });
    state = attachmentsReducer(state, { type: 'remove', key: 'w' });
    expect(state.items).toHaveLength(0);
    expect(state.dismissedWorking).toBe(true);
  });

  it('clear empties tray and marks dismissed', () => {
    let state = attachmentsReducer(createAttachmentsState(), {
      type: 'hydrate',
      dismissedWorking: false,
      items: [
        {
          key: 'w',
          assetId: '1',
          previewUrl: 'p',
          uploading: false,
          working: true,
        },
      ],
    });
    state = attachmentsReducer(state, { type: 'clear' });
    expect(state.items).toHaveLength(0);
    expect(state.dismissedWorking).toBe(true);
  });

  it('set_working prepends unless dismissed', () => {
    let state = createAttachmentsState();
    state = attachmentsReducer(state, {
      type: 'set_working',
      assetId: 'a1',
      previewUrl: 'p',
      max: 4,
    });
    expect(state.items[0]?.working).toBe(true);
    expect(readyAssetIds(state)).toEqual(['a1']);

    state = attachmentsReducer(state, { type: 'dismiss_working' });
    state = attachmentsReducer(state, {
      type: 'set_working',
      assetId: 'a2',
      previewUrl: 'p2',
      max: 4,
    });
    expect(state.items).toHaveLength(0);
  });
});
