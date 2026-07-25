/**
 * CRC16-CCITT (polynomial 0x1021, initial value 0xFFFF) as required by
 * EMV QR Code spec (BACEN BR Code). Used to validate the 4-character hex
 * checksum appended to every BR Code payload.
 */
export function crc16(payload: string): number {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

/** Validate the CRC16 checksum embedded in a BR Code string. */
export function validateCrc16(brCode: string): boolean {
  if (brCode.length < 4) return false;
  const payload = brCode.slice(0, -4);
  const embedded = brCode.slice(-4).toUpperCase();
  const computed = crc16(payload).toString(16).toUpperCase().padStart(4, "0");
  return embedded === computed;
}
