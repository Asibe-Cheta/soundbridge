/**
 * Approximate caret position in a textarea (viewport coordinates).
 * Used to anchor floating UI (e.g. @mention dropdown) below the caret.
 */
const COPY_PROPS: readonly string[] = [
  'direction',
  'boxSizing',
  'width',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontFamily',
  'textAlign',
  'textTransform',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
  'wordBreak',
];

export function getTextareaCaretClientRect(
  textarea: HTMLTextAreaElement,
  position: number
): { left: number; top: number; height: number } {
  if (typeof document === 'undefined') {
    const r = textarea.getBoundingClientRect();
    return { left: r.left + 8, top: r.top + 8, height: 20 };
  }

  const div = document.createElement('div');
  const style = div.style;
  const computed = getComputedStyle(textarea);

  for (const prop of COPY_PROPS) {
    const v = computed.getPropertyValue(prop);
    style.setProperty(prop, v);
  }

  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.width = `${textarea.clientWidth}px`;
  style.height = 'auto';

  const text = textarea.value.slice(0, position);
  div.textContent = text;
  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(position) || '.';
  div.appendChild(marker);

  document.body.appendChild(div);
  const rect = marker.getBoundingClientRect();
  document.body.removeChild(div);

  return {
    left: rect.left,
    top: rect.top,
    height: rect.height || parseFloat(computed.lineHeight) || 20,
  };
}
