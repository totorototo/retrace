// Strips who recorded a FIT activity, keeping the race: only the messages below are copied,
// and the watch's serial number is blanked. Everything else goes, user_profile (name, weight,
// height), zones_target (max HR, FTP), device_info and device_settings included.
//
//   node scripts/scrub-fit.mjs in.fit out.fit
//
// why: a keep-list, not a list of what to drop: Garmin writes undocumented messages
// (unknown_79, unknown_140, ...) that may hold more of the profile, and a drop-list would let
// them through.

import { readFileSync, writeFileSync } from "node:fs";

const FILE_ID = 0;
const KEEP = new Set([
  FILE_ID,
  18, // session
  19, // lap
  20, // record
  21, // event
  34, // activity
]);
const FILE_ID_SERIAL = 3; // uint32z: 0 is its invalid value

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401,
  0x5000, 0x9c01, 0x8801, 0x4400,
];

// The FIT SDK's CRC-16, a nibble at a time.
function crc16(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    for (const nibble of [byte & 0xf, byte >> 4]) {
      const tmp = CRC_TABLE[crc & 0xf];
      crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[nibble];
    }
  }
  return crc;
}

export function scrub(input) {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const headerSize = input[0];
  const dataEnd = headerSize + view.getUint32(4, true);
  if (String.fromCharCode(...input.subarray(8, 12)) !== ".FIT") throw new Error("not a FIT file");

  const definitions = new Map(); // local message type → { global, size, keep, serialOffset }
  const kept = [];
  let p = headerSize;
  while (p < dataEnd) {
    const header = input[p];
    if (header & 0x80) {
      // Compressed timestamp header: a data message of local type 0-3.
      const definition = definitions.get((header >> 5) & 0x3);
      if (definition.keep) kept.push(input.subarray(p, p + 1 + definition.size));
      p += 1 + definition.size;
      continue;
    }
    const local = header & 0xf;
    if (header & 0x40) {
      const littleEndian = input[p + 2] === 0;
      const global = view.getUint16(p + 3, littleEndian);
      const fieldCount = input[p + 5];
      let q = p + 6;
      let size = 0;
      let serialOffset = null;
      for (let i = 0; i < fieldCount; i++, q += 3) {
        if (global === FILE_ID && input[q] === FILE_ID_SERIAL) serialOffset = size;
        size += input[q + 1];
      }
      if (header & 0x20) {
        const developerCount = input[q];
        q += 1;
        for (let i = 0; i < developerCount; i++, q += 3) size += input[q + 1];
      }
      const keep = KEEP.has(global);
      if (keep && header & 0x20) throw new Error(`developer fields in message ${global}`);
      definitions.set(local, { global, size, keep, serialOffset });
      if (keep) kept.push(input.subarray(p, q));
      p = q;
      continue;
    }
    const definition = definitions.get(local);
    if (definition.keep) {
      const message = input.slice(p, p + 1 + definition.size);
      if (definition.serialOffset !== null)
        message.fill(0, 1 + definition.serialOffset, 5 + definition.serialOffset);
      kept.push(message);
    }
    p += 1 + definition.size;
  }

  const dataSize = kept.reduce((sum, message) => sum + message.length, 0);
  const output = new Uint8Array(headerSize + dataSize + 2);
  output.set(input.subarray(0, headerSize));
  const out = new DataView(output.buffer);
  out.setUint32(4, dataSize, true);
  // A 14-byte header carries its own CRC; 0 means none was written.
  if (headerSize >= 14 && out.getUint16(12, true) !== 0) {
    out.setUint16(12, crc16(output.subarray(0, 12)), true);
  }
  let offset = headerSize;
  for (const message of kept) {
    output.set(message, offset);
    offset += message.length;
  }
  out.setUint16(offset, crc16(output.subarray(0, offset)), true);
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , from, to] = process.argv;
  if (!from || !to) {
    console.error("usage: node scripts/scrub-fit.mjs in.fit out.fit");
    process.exit(1);
  }
  const output = scrub(readFileSync(from));
  writeFileSync(to, output);
  console.log(`${to}: ${output.length} bytes`);
}
