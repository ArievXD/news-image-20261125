// THE WORLD IN ONE DAY — 25 November 2026
// Dot-matrix newspaper renderer. Node's standard library only. Nothing is read
// from disk, the clock, or the network, so repeated runs produce identical bytes.
// Run: MAKEFUN_OUTPUT_DIR=out node main.ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------------------
// Bitmap font: every glyph is 7 rows of 5 dots, written as "#" / "." strings.
// Uppercase, lowercase, digits and the punctuation the copy needs.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "....#", "....#", "....#", "....#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".###."],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [".....", ".....", ".###.", "#....", "#....", "#....", ".###."],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..###", ".#...", ".#...", "#####", ".#...", ".#...", ".#..."],
  g: [".....", ".####", "#...#", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: [".#...", ".....", ".#...", ".#...", ".#...", ".#...", ".#..."],
  j: ["..#..", ".....", "..#..", "..#..", "..#..", "#.#..", ".#..."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".#...", ".#...", ".#...", ".#...", ".#...", ".#...", ".#..."],
  m: [".....", ".....", "#.#.#", "##.##", "#.#.#", "#...#", "#...#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [".....", ".....", "####.", "#...#", "#...#", "####.", "#...."],
  q: [".....", ".....", ".####", "#...#", "#...#", ".####", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "#####", ".#...", ".#...", ".#...", ".#..."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".###."],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", "#...."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "#...."],
  "!": [".#...", ".#...", ".#...", ".#...", ".#...", ".....", ".#..."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": [".##..", ".##..", ".#...", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "(": ["...##", "..#..", ".#...", ".#...", ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.", "...#.", "..#..", "##..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "\u2022": [".....", ".###.", ".###.", ".###.", ".....", ".....", "....."],
};

// ---------------------------------------------------------------------------
// Canvas: a plain RGB framebuffer with a few drawing verbs.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const PAPER: RGB = [250, 246, 236];
const INK: RGB = [26, 26, 26];
const RED: RGB = [179, 39, 30];
const GREY: RGB = [110, 105, 95];
const NAVY: RGB = [31, 56, 100];
const HAIR: RGB = [201, 194, 176];

interface Page {
  w: number;
  h: number;
  data: Uint8Array;
  dab(x: number, y: number, c: RGB): void;
  block(x: number, y: number, w: number, h: number, c: RGB): void;
  rule(x: number, y: number, w: number, c: RGB): void;
  frame(x: number, y: number, w: number, h: number, c: RGB): void;
}

function makeCanvas(w: number, h: number, bg: RGB): Page {
  const data = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    data[i * 3] = bg[0];
    data[i * 3 + 1] = bg[1];
    data[i * 3 + 2] = bg[2];
  }
  const page: Page = {
    w,
    h,
    data,
    dab(x, y, c) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const o = (y * w + x) * 3;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
    },
    block(x, y, bw, bh, c) {
      for (let yy = y; yy < y + bh; yy++)
        for (let xx = x; xx < x + bw; xx++) page.dab(xx, yy, c);
    },
    rule(x, y, bw, c) {
      page.block(x, y, bw, 2, c);
    },
    frame(x, y, bw, bh, c) {
      page.block(x, y, bw, 2, c);
      page.block(x, y + bh - 2, bw, 2, c);
      page.block(x, y, 2, bh, c);
      page.block(x + bw - 2, y, 2, bh, c);
    },
  };
  return page;
}

// ---------------------------------------------------------------------------
// Typesetting on the dot matrix. One glyph cell is 6 units wide (5 dots + 1 gap).
// ---------------------------------------------------------------------------
function glyphRows(ch: string): string[] {
  const rows = FONT[ch];
  if (!rows) throw new Error("no glyph for character: " + JSON.stringify(ch));
  return rows;
}

// Proportional advance: one blank unit after each glyph's rightmost ink.
// Fixed 6-unit cells left a 4-unit phantom gap after thin glyphs (i, l, j, 1
// and narrow punctuation), splitting words mid-way ("Tiangong" read as
// "Ti angong", "launched" as "l aunched", "station" as "stat ion").
// Full-width glyphs keep 6; the space stays 6 so real word gaps still read.
function glyphAdvance(ch: string): number {
  if (ch === " ") return 6;
  const rows = glyphRows(ch);
  let right = 0;
  for (const row of rows)
    for (let c = 0; c < 5; c++) if (row[c] === "#") right = Math.max(right, c);
  return Math.min(6, right + 2);
}

function textWidth(s: string, scale: number): number {
  let units = -1;
  for (const ch of s) units += glyphAdvance(ch);
  return units * scale;
}

function typeset(cv: Page, s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const rows = glyphRows(ch);
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (rows[r][col] !== "#") continue;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++)
            cv.dab(cx + col * scale + dx, y + r * scale + dy, c);
      }
    }
    cx += glyphAdvance(ch) * scale;
  }
}

function centered(cv: Page, s: string, y: number, scale: number, c: RGB): void {
  typeset(cv, s, Math.round((cv.w - textWidth(s, scale)) / 2), y, scale, c);
}

// Greedy word wrap. Returns lines that fit maxWidth at the given scale.
function fold(s: string, maxWidth: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function para(cv: Page, s: string, x: number, y: number, maxWidth: number, scale: number, c: RGB, leading: number): number {
  const lines = fold(s, maxWidth, scale);
  lines.forEach((line, i) => typeset(cv, line, x, y + i * leading, scale, c));
  return lines.length;
}

// ---------------------------------------------------------------------------
// PNG writer: CRC lookup table, chunk assembly, raw scanlines through zlib.
// ---------------------------------------------------------------------------
const crcLUT: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcLUT[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(kind: string, payload: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(payload.length, 0);
  const head = Buffer.concat([Buffer.from(kind, "ascii"), payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(head), 0);
  return Buffer.concat([len, head, crc]);
}

function writePng(cv: Page, outPath: string): void {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(cv.h * (1 + cv.w * 3));
  for (let y = 0; y < cv.h; y++) {
    raw[y * (1 + cv.w * 3)] = 0; // filter: none
    raw.set(cv.data.subarray(y * cv.w * 3, (y + 1) * cv.w * 3), y * (1 + cv.w * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);
}

// ---------------------------------------------------------------------------
// Layout: masthead, lead, stat strip, 2x2 support grid, also-today, footer.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const ML = 44; // left margin
const CW = W - ML * 2; // content width = 936

function layOut(): Page {
  const cv = makeCanvas(W, H, PAPER);

  // Top double rule.
  cv.block(ML, 24, CW, 3, INK);
  cv.block(ML, 30, CW, 1, INK);

  // Masthead.
  typeset(cv, "THE WORLD IN ONE DAY", Math.round((W - textWidth("THE WORLD IN ONE DAY", 5)) / 2), 44, 5, RED);

  // Dateline with flanking red rules.
  const dateLine = "WEDNESDAY, 25 NOVEMBER 2026";
  const dateW = textWidth(dateLine, 2);
  const dateX = Math.round((W - dateW) / 2);
  cv.block(ML, 100, dateX - ML - 24, 2, RED);
  cv.block(dateX + dateW + 24, 100, W - ML - (dateX + dateW + 24), 2, RED);
  typeset(cv, dateLine, dateX, 94, 2, INK);

  // Lead headline, two lines, left aligned.
  typeset(cv, "ALL HOSTAGES FREED", ML, 124, 5, INK);
  typeset(cv, "AFTER DAY-LONG SIEGE", ML, 164, 5, INK);
  cv.block(ML, 208, 180, 4, RED);

  // Lead deck.
  para(
    cv,
    "Colombian special forces stormed an Exito supermarket in Cartagena early on Wednesday, freeing all the hostages after a day-long siege. One gunman was killed and four were detained.",
    ML,
    224,
    CW,
    2,
    INK,
    18,
  );

  // Stat strip: three navy boxes.
  const stats: [string, string][] = [
    ["30", "PEOPLE HELD HOSTAGE"],
    ["10", "FREED DURING THE DAY"],
    ["4", "GUNMEN DETAINED"],
  ];
  const boxW = 296;
  const gap = 24;
  stats.forEach(([num, label], i) => {
    const bx = ML + i * (boxW + gap);
    cv.block(bx, 292, boxW, 108, NAVY);
    typeset(cv, num, bx + Math.round((boxW - textWidth(num, 6)) / 2), 308, 6, PAPER);
    typeset(cv, label, bx + Math.round((boxW - textWidth(label, 2)) / 2), 364, 2, PAPER);
  });

  // Divider.
  cv.block(ML, 418, CW, 2, INK);

  // Support grid, 2 columns x 2 rows.
  const colW = 452;
  const colX = [ML, ML + colW + 32];
  const rowY = [440, 676];
  const cells: { kicker: string; head: string; body: string }[] = [
    {
      kicker: "SPACE - CHINA",
      head: "Pakistan's first astronaut reaches Tiangong",
      body: "Shenzhou-24 launched on Wednesday and docked hours later. Muhammad Zeeshan Ali, 40, is the first Pakistani in orbit and the first foreign astronaut aboard China's Tiangong station. He stays about a week.",
    },
    {
      kicker: "WAR - YEMEN",
      head: "Hodeidah hit as Houthis threaten Jeddah",
      body: "The Saudi-led coalition struck the Yemeni port after an evacuation order. The Houthis warned Jeddah and every Saudi Red Sea port would be a target, and Saudi defences shot down four drones.",
    },
    {
      kicker: "PACIFIC - SOLOMONS",
      head: "Solomons picks Australia, bars foreign bases",
      body: "The two prime ministers signed a treaty in Canberra making Australia the island nation's primary security partner. Honiara pledged no foreign military base on its soil, as its 2022 pact with China lapses.",
    },
    {
      kicker: "MARKETS - NVIDIA",
      head: "Nvidia rally fizzles as Congress turns",
      body: "Shares fell about 6 percent on Tuesday after a 31.5 percent jump on Monday. Lawmakers from both parties attacked President Trump's role in bringing back Jensen Huang and vowed tougher chip curbs.",
    },
  ];
  cells.forEach((cell, i) => {
    const x = colX[i % 2];
    const y = rowY[Math.floor(i / 2)];
    cv.block(x, y + 3, 8, 8, RED);
    typeset(cv, cell.kicker, x + 14, y, 2, RED);
    const headLines = fold(cell.head, colW, 3);
    headLines.forEach((line, j) => typeset(cv, line, x, y + 22 + j * 25, 3, INK));
    const bodyY = y + 22 + headLines.length * 25 + 8;
    para(cv, cell.body, x, bodyY, colW, 2, GREY, 18);
  });
  // Column divider and row divider.
  cv.block(ML + colW + 15, 440, 2, 452, HAIR);
  cv.block(ML, 664, CW, 1, HAIR);

  // Divider above Also Today.
  cv.block(ML, 908, CW, 2, INK);

  // Also Today strip.
  typeset(cv, "ALSO TODAY - 25 NOVEMBER 2026", ML, 924, 2, RED);
  const also = [
    "Senegal: CAS hands back the Africa Cup title.",
    "Bangladesh: garment minimum wage rises 36 percent after protests.",
    "Indonesia: rescuers search for dozens trapped in a deep mine.",
  ];
  also.forEach((line, i) => {
    const y = 946 + i * 18;
    cv.block(ML, y + 4, 6, 6, RED);
    typeset(cv, line, ML + 14, y, 2, INK);
  });

  // Footer.
  centered(cv, "25 November 2026 - Sources: Reuters, AFP, Nature, CNN, Al Jazeera", 1004, 2, GREY);

  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  const cv = layOut();
  writePng(cv, path.join(outDir, "entry.png"));
}

main();
