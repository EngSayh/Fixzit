/**
 * ZATCA Crypto Utilities
 * @module lib/zatca/crypto
 */

import { createHash, createSign, generateKeyPairSync, randomUUID } from "crypto";
import type { ZatcaCsrConfig } from "./fatoora-types";

export function generateInvoiceHash(xml: string): string { return createHash("sha256").update(xml, "utf8").digest("base64"); }
export function generateInvoiceUuid(): string { return randomUUID(); }
export function generateKeyPair(): { privateKey: string; publicKey: string } { const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1", privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } }); return { privateKey, publicKey }; }
export function generateCsr(config: ZatcaCsrConfig): string { const subject = [`CN=${config.commonName}`, `serialNumber=${config.serialNumber}`, `O=${config.organizationName}`, config.organizationUnitName ? `OU=${config.organizationUnitName}` : "", `C=${config.countryName}`].filter(Boolean).join(", "); return Buffer.from(`-----BEGIN CERTIFICATE REQUEST-----\n${subject}\nInvoiceType=${config.invoiceType}\nLocation=${config.location}\nIndustry=${config.industry}\n-----END CERTIFICATE REQUEST-----`).toString("base64"); }
export function signData(data: string, privateKey: string): string { const sign = createSign("SHA256"); sign.update(data); sign.end(); return sign.sign(privateKey, "base64"); }
function encodeTlv(tag: number, value: Buffer): Buffer { return Buffer.concat([Buffer.from([tag]), Buffer.from([value.length]), value]); }
export function generatePhase2TlvData(sellerName: string, vatNumber: string, timestamp: string, invoiceTotal: string, vatTotal: string, invoiceHash: string, signature: string, publicKey: string, certificateSignature: string): string { const tlvData: Buffer[] = [encodeTlv(1, Buffer.from(sellerName, "utf8")), encodeTlv(2, Buffer.from(vatNumber, "utf8")), encodeTlv(3, Buffer.from(timestamp, "utf8")), encodeTlv(4, Buffer.from(invoiceTotal, "utf8")), encodeTlv(5, Buffer.from(vatTotal, "utf8")), encodeTlv(6, Buffer.from(invoiceHash, "base64")), encodeTlv(7, Buffer.from(signature, "base64")), encodeTlv(8, Buffer.from(publicKey, "utf8")), encodeTlv(9, Buffer.from(certificateSignature, "base64"))]; return Buffer.concat(tlvData).toString("base64"); }
export function getInitialInvoiceHash(): string { return createHash("sha256").update("0").digest("base64"); }
export const ZatcaCrypto = { generateInvoiceHash, generateInvoiceUuid, generateKeyPair, generateCsr, signData, generatePhase2TlvData, getInitialInvoiceHash };
