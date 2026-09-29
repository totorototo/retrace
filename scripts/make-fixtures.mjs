// Writes a small synthetic race: a 6 km route with typed checkpoints (GPX) and the activity
// of a runner who ran it (FIT). No personal recording is committed: both files are made here,
// so their contents are known by construction.
//
//   node scripts/make-fixtures.mjs
//
// Output: zig/testdata/route.gpx and zig/testdata/activity.fit (used by zig tests and e2e).

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "zig", "testdata");

// ── The route ─────────────────────────────────────────────────────────────────
// Due north from Gavarnie for 6 km, one 250 m hill in the middle, a point every 20 m.

const START = { lat: 42.73, lon: -0.01 };
const LENGTH_M = 6000;
const STEP_M = 20;
const M_PER_DEG_LAT = 111_320;
const START_EPOCH_S = Date.UTC(2026, 5, 6, 6, 0, 0) / 1000; // 2026-06-06T06:00:00Z

const elevationAt = (d) => 1400 + 250 * Math.sin((Math.PI * d) / LENGTH_M) ** 2;
const latAt = (d) => START.lat + d / M_PER_DEG_LAT;

const points = [];
for (let d = 0; d <= LENGTH_M; d += STEP_M) {
  points.push({ d, lat: latAt(d), lon: START.lon, ele: elevationAt(d) });
}

const checkpoints = [
  { d: 0, name: "Start", type: "Start", cutoffS: 0 },
  { d: 3000, name: "Refuge", type: "TimeBarrier", cutoffS: 2 * 3600 },
  { d: LENGTH_M, name: "Finish", type: "Arrival", cutoffS: 4 * 3600 },
];

const iso = (epochS) => new Date(epochS * 1000).toISOString().replace(".000", "");

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="retrace make-fixtures" xmlns="http://www.topografix.com/GPX/1/1">
<metadata>
  <name>Synthetic 6K</name>
  <desc>Synthetic route for retrace tests</desc>
</metadata>
${checkpoints
  .map(
    (c) => `<wpt lat="${latAt(c.d).toFixed(7)}" lon="${START.lon.toFixed(7)}">
  <ele>${elevationAt(c.d).toFixed(1)}</ele>
  <name>${c.name}</name>
  <type>${c.type}</type>
  <time>${iso(START_EPOCH_S + c.cutoffS)}</time>
</wpt>`,
  )
  .join("\n")}
<trk>
  <name>Synthetic 6K</name>
  <trkseg>
${points
  .map(
    (p) =>
      `    <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><ele>${p.ele.toFixed(1)}</ele></trkpt>`,
  )
  .join("\n")}
  </trkseg>
</trk>
</gpx>
`;

// ── The runner ────────────────────────────────────────────────────────────────
// 7:30/km on the flat, slower uphill, faster downhill, 4 minutes at the Refuge.
// One record every 5 s.

const SAMPLE_S = 5;
const FLAT_PACE_S_PER_M = 450 / 1000;
const STOP_AT_M = 3000;
const STOP_S = 240;

const samples = [];
{
  let t = 0;
  let d = 0;
  let stopped = false;
  while (d < LENGTH_M) {
    samples.push({ t, d });
    if (!stopped && d >= STOP_AT_M) {
      for (let s = SAMPLE_S; s <= STOP_S; s += SAMPLE_S) samples.push({ t: t + s, d });
      t += STOP_S;
      stopped = true;
    }
    const grade = (elevationAt(d + 1) - elevationAt(d)) / 1;
    const pace =
      FLAT_PACE_S_PER_M * (1 + 6 * Math.max(grade, 0) - 1.5 * Math.min(Math.max(-grade, 0), 0.05));
    d = Math.min(LENGTH_M, d + SAMPLE_S / pace);
    t += SAMPLE_S;
  }
  samples.push({ t, d: LENGTH_M });
}

// ── FIT encoding ──────────────────────────────────────────────────────────────
// Just enough of the protocol for fitz and debriefz: file_id, then record messages.

const FIT_EPOCH_OFFSET_S = 631_065_600; // 1989-12-31T00:00:00Z
const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401,
  0x5000, 0x9c01, 0x8801, 0x4400,
];

function fitCrc(bytes, crc = 0) {
  for (const byte of bytes) {
    let tmp = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[byte & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xf];
  }
  return crc;
}

const BASE = { enum: 0x00, uint8: 0x02, uint16: 0x84, sint32: 0x85, uint32: 0x86 };
const SIZE = {
  [BASE.enum]: 1,
  [BASE.uint8]: 1,
  [BASE.uint16]: 2,
  [BASE.sint32]: 4,
  [BASE.uint32]: 4,
};

const chunks = [];
const push = (...bytes) => chunks.push(Uint8Array.from(bytes));

function define(local, globalNumber, fields) {
  const header = [0x40 | local, 0, 0, globalNumber & 0xff, globalNumber >> 8, fields.length];
  push(...header, ...fields.flatMap(([num, base]) => [num, SIZE[base], base]));
  return fields;
}

function write(local, fields, values) {
  const out = [local];
  fields.forEach(([, base], i) => {
    const size = SIZE[base];
    const buf = new DataView(new ArrayBuffer(size));
    if (base === BASE.sint32) buf.setInt32(0, values[i], true);
    else if (size === 4) buf.setUint32(0, values[i], true);
    else if (size === 2) buf.setUint16(0, values[i], true);
    else buf.setUint8(0, values[i]);
    out.push(...new Uint8Array(buf.buffer));
  });
  push(...out);
}

const semicircles = (deg) => Math.round((deg * 2 ** 31) / 180);
const fitTime = (epochS) => epochS - FIT_EPOCH_OFFSET_S;

const fileId = define(0, 0, [
  [0, BASE.enum], // type
  [1, BASE.uint16], // manufacturer
  [4, BASE.uint32], // time_created
]);
write(0, fileId, [4, 255, fitTime(START_EPOCH_S)]); // activity, development

const record = define(1, 20, [
  [253, BASE.uint32], // timestamp
  [0, BASE.sint32], // position_lat
  [1, BASE.sint32], // position_long
  [2, BASE.uint16], // altitude: (m + 500) * 5
  [5, BASE.uint32], // distance: m * 100
  [3, BASE.uint8], // heart_rate
]);
for (const { t, d } of samples) {
  const hr = Math.round(130 + 25 * Math.sin((Math.PI * d) / LENGTH_M));
  write(1, record, [
    fitTime(START_EPOCH_S + t),
    semicircles(latAt(d)),
    semicircles(START.lon),
    Math.round((elevationAt(d) + 500) * 5),
    Math.round(d * 100),
    hr,
  ]);
}

const dataSize = chunks.reduce((n, c) => n + c.length, 0);
const header = new DataView(new ArrayBuffer(14));
header.setUint8(0, 14);
header.setUint8(1, 0x20); // protocol 2.0
header.setUint16(2, 2132, true); // profile 21.32
header.setUint32(4, dataSize, true);
[..."\x2eFIT"].forEach((ch, i) => header.setUint8(8 + i, ch.charCodeAt(0)));
header.setUint16(12, fitCrc(new Uint8Array(header.buffer, 0, 12)), true);

const body = new Uint8Array(14 + dataSize + 2);
body.set(new Uint8Array(header.buffer), 0);
let offset = 14;
for (const c of chunks) {
  body.set(c, offset);
  offset += c.length;
}
const fileCrc = fitCrc(body.subarray(0, offset));
body[offset] = fileCrc & 0xff;
body[offset + 1] = fileCrc >> 8;

writeFileSync(join(OUT_DIR, "route.gpx"), gpx);
writeFileSync(join(OUT_DIR, "activity.fit"), body);
console.log(
  `route.gpx: ${points.length} points, activity.fit: ${samples.length} records, ` +
    `${Math.round(samples.at(-1).t / 60)} min`,
);
