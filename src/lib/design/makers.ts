// Real vendors that take real orders. The design's B.MAKER_KINDS entries
// are demo placeholders; these are named shops with online quoting.
// Addresses are root domains only — no personal contact info.

export interface RealMaker {
  name: string;
  does: string;
  contact: "email" | "phone" | "web";
  address: string;
  /** What to do on their site with the downloaded pack. */
  hint: string;
}

export const REAL_MAKERS: Record<string, RealMaker[]> = {
  hardware: [
    {
      name: "SendCutSend",
      does: "Laser + CNC, US shops · takes real orders",
      contact: "web",
      address: "sendcutsend.com",
      hint: "Upload the DXF or STEP from the pack on their instant-quote page.",
    },
    {
      name: "Xometry",
      does: "CNC / 3D print / sheet instant quote · takes real orders",
      contact: "web",
      address: "xometry.com",
      hint: "Upload the STEP or STL from the pack on their quoting page.",
    },
  ],
  print: [
    {
      name: "MOO",
      does: "Cards, menus, posters · takes real orders",
      contact: "web",
      address: "moo.com",
      hint: "Upload the artwork from the pack to start an order.",
    },
    {
      name: "GotPrint",
      does: "High-run print · takes real orders",
      contact: "web",
      address: "gotprint.com",
      hint: "Upload the artwork from the pack to start an order.",
    },
  ],
};
