/** The software sketch: the real spec drawn as a B&W wireframe — one
 *  phone frame per screen, one labeled box per block. Deterministic and
 *  instant: zero mismatch with the app, because it IS the app on paper.
 *  Pure HTML strings so tests can lock the contract in node; BoardPanel
 *  inlines the result. */

export interface WireBlock {
  type: string;
  title: string;
}

export interface WireScreen {
  title: string;
  blocks: WireBlock[];
}

const WIRE_ICON: Record<string, string> = {
  list: "📋",
  form: "✏️",
  stat: "📈",
  see: "👁️",
  hear: "🎙️",
  price: "🧾",
  compare: "↔️",
  teach: "🎚️",
  draw: "🎨",
  make: "🪚",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    return (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ] ?? c
    );
  });
}

export function renderSpecWireframe(
  screens: WireScreen[],
  formFactor: "mobile" | "desktop" = "mobile",
): string {
  if (screens.length === 0) {
    return '<p class="sa-note">No screens yet.</p>';
  }
  const desk = formFactor === "desktop" ? " desk" : "";
  const summary = screens
    .map((s) => `${s.title} (${s.blocks.length})`)
    .join(", ");
  let h = `<div class="sw-grid${desk}" role="img" aria-label="Wireframe: ${esc(summary)}">`;
  for (const s of screens) {
    h += `<div class="sw-phone${desk}">`;
    h += `<div class="sw-bar">${esc(s.title)}</div>`;
    h += '<div class="sw-blocks">';
    for (const b of s.blocks) {
      const icon = WIRE_ICON[b.type] ?? "▫️";
      h +=
        `<div class="sw-block"><span aria-hidden="true">${icon}</span>` +
        `<span class="sw-title">${esc(b.title)}</span></div>`;
    }
    h += "</div></div>";
  }
  return h + "</div>";
}
