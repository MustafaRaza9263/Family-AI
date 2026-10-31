import type { AttachmentItem, AttachmentsState } from './types';

export type AttachmentsAction =
  | { type: 'hydrate'; items: AttachmentItem[]; dismissedWorking: boolean }
  | { type: 'add'; item: AttachmentItem; max: number }
  | { type: 'mark_uploaded'; key: string; assetId: string; previewUrl: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'fail_upload'; key: string }
  | { type: 'set_working'; assetId: string; previewUrl: string; max: number }
  | { type: 'dismiss_working' };

export function createAttachmentsState(): AttachmentsState {
  return { items: [], dismissedWorking: false };
}

export function attachmentsReducer(
  state: AttachmentsState,
  action: AttachmentsAction,
): AttachmentsState {
  switch (action.type) {
    case 'hydrate':
      return {
        items: action.items,
        dismissedWorking: action.dismissedWorking,
      };
    case 'add': {
      if (state.items.length >= action.max) return state;
      return { ...state, items: [...state.items, action.item] };
    }
    case 'mark_uploaded':
      return {
        ...state,
        items: state.items.map((item) =>
          item.key === action.key
            ? {
                ...item,
                assetId: action.assetId,
                previewUrl: action.previewUrl,
                uploading: false,
              }
            : item,
        ),
      };
    case 'remove': {
      const removed = state.items.find((i) => i.key === action.key);
      const items = state.items.filter((i) => i.key !== action.key);
      return {
        items,
        dismissedWorking:
          removed?.working === true ? true : state.dismissedWorking,
      };
    }
    case 'clear':
      return {
        items: [],
        dismissedWorking: true,
      };
    case 'fail_upload':
      return {
        ...state,
        items: state.items.filter((i) => i.key !== action.key),
      };
    case 'set_working': {
      if (state.dismissedWorking) return state;
      const rest = state.items.filter((i) => !i.working);
      const working: AttachmentItem = {
        key: `working-${action.assetId}`,
        assetId: action.assetId,
        previewUrl: action.previewUrl,
        uploading: false,
        working: true,
      };
      const next = [working, ...rest.filter((i) => i.assetId !== action.assetId)];
      return {
        dismissedWorking: false,
        items: next.slice(0, action.max),
      };
    }
    case 'dismiss_working':
      return {
        dismissedWorking: true,
        items: state.items.filter((i) => !i.working),
      };
    default:
      return state;
  }
}

export function readyAssetIds(state: AttachmentsState): string[] {
  return state.items
    .filter((i) => i.assetId && !i.uploading)
    .map((i) => i.assetId as string);
}

export function hasUploading(state: AttachmentsState): boolean {
  return state.items.some((i) => i.uploading);
}
