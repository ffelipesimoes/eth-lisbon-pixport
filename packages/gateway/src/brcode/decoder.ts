import { validateCrc16 } from "./crc16.js";
import type { BrCode, EmvField } from "./types.js";

export class BrCodeDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrCodeDecodeError";
  }
}

/** Parse a flat EMV TLV string into an array of fields. */
function parseTlv(data: string): EmvField[] {
  const fields: EmvField[] = [];
  let cursor = 0;
  while (cursor < data.length) {
    if (cursor + 4 > data.length) break;
    const id = data.slice(cursor, cursor + 2);
    const len = parseInt(data.slice(cursor + 2, cursor + 4), 10);
    if (isNaN(len) || cursor + 4 + len > data.length) {
      throw new BrCodeDecodeError(
        `Malformed TLV at offset ${cursor}: id=${id} len=${len}`
      );
    }
    const value = data.slice(cursor + 4, cursor + 4 + len);
    fields.push({ id, length: len, value });
    cursor += 4 + len;
  }
  return fields;
}

function fieldMap(fields: EmvField[]): Map<string, string> {
  return new Map(fields.map((f) => [f.id, f.value]));
}

/**
 * Decode a BR Code (BACEN EMV QR Code) string.
 *
 * Throws BrCodeDecodeError on:
 *   - CRC16 mismatch (malformed or tampered payload)
 *   - Missing mandatory fields
 *   - Structural TLV parse errors
 */
export function decodeBrCode(raw: string): BrCode {
  const trimmed = raw.trim();

  if (!validateCrc16(trimmed)) {
    throw new BrCodeDecodeError(
      "CRC16 validation failed — BR Code is malformed or tampered"
    );
  }

  let fields: EmvField[];
  try {
    fields = parseTlv(trimmed);
  } catch (err) {
    if (err instanceof BrCodeDecodeError) throw err;
    throw new BrCodeDecodeError(`TLV parse error: ${String(err)}`);
  }

  const m = fieldMap(fields);

  const payloadFormatIndicator = m.get("00");
  if (!payloadFormatIndicator) {
    throw new BrCodeDecodeError("Missing mandatory field 00 (PayloadFormatIndicator)");
  }

  const merchantCategoryCode = m.get("52");
  if (!merchantCategoryCode) {
    throw new BrCodeDecodeError("Missing mandatory field 52 (MerchantCategoryCode)");
  }

  const transactionCurrency = m.get("53");
  if (!transactionCurrency) {
    throw new BrCodeDecodeError("Missing mandatory field 53 (TransactionCurrency)");
  }

  const countryCode = m.get("58");
  if (!countryCode) {
    throw new BrCodeDecodeError("Missing mandatory field 58 (CountryCode)");
  }

  const merchantName = m.get("59");
  if (!merchantName) {
    throw new BrCodeDecodeError("Missing mandatory field 59 (MerchantName)");
  }

  const merchantCity = m.get("60");
  if (!merchantCity) {
    throw new BrCodeDecodeError("Missing mandatory field 60 (MerchantCity)");
  }

  // Parse Merchant Account Information (ID 26 — BR Code specific)
  let merchantAccount: BrCode["merchantAccount"];
  const rawMai = m.get("26");
  if (rawMai) {
    const maiFields = fieldMap(parseTlv(rawMai));
    merchantAccount = {
      gui: maiFields.get("00") ?? "",
      key: maiFields.get("01"),
      additionalInfo: maiFields.get("02"),
      fss: maiFields.get("03"),
    };
  }

  // Parse Additional Data Field Template (ID 62)
  let additionalData: BrCode["additionalData"];
  const rawAdf = m.get("62");
  if (rawAdf) {
    const adfFields = fieldMap(parseTlv(rawAdf));
    additionalData = { referenceLabel: adfFields.get("05") };
  }

  return {
    raw: trimmed,
    payloadFormatIndicator,
    pointOfInitiationMethod: m.get("01"),
    merchantAccount,
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount: m.get("54"),
    countryCode,
    merchantName,
    merchantCity,
    postalCode: m.get("61"),
    additionalData,
    fields,
  };
}
