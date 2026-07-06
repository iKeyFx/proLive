/**
 * The ProLive gauge mark as an inline SVG, plus a data-URI helper for embedding
 * inside generated (ImageResponse) images. Transparent background so it can sit
 * on whatever surface the image provides.
 */
export const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="12" stroke="#E2B341" stroke-width="2.5"/>
  <line x1="16" y1="2.5" x2="16" y2="6" stroke="#E2B341" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="16" y1="16" x2="23" y2="9" stroke="#ECEFF1" stroke-width="3" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="2.6" fill="#E2B341"/>
</svg>`;

export function markDataUri(): string {
  return `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString("base64")}`;
}
