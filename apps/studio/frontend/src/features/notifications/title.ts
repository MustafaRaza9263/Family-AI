import { PRODUCT_NAME } from '@studio/shared';

let pending = 0;
const baseTitle = () => PRODUCT_NAME;

export function bumpReadyTitle(): void {
  pending += 1;
  document.title = `(${pending}) Ready · ${PRODUCT_NAME}`;
}

export function clearReadyTitle(): void {
  pending = 0;
  document.title = baseTitle();
}
