import "server-only";
import QRCode from "qrcode";

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 320 });
}
