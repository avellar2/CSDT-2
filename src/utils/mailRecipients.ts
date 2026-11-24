import type { MailSendResult } from "@/utils/mailer";

/**
 * Interpreta o retorno do SMTP sem confundir aceite de CC com sucesso do
 * destinatário principal.
 */
export function normalizeAddress(value: string): string {
  const insideBrackets = value.match(/<([^>]+)>/);
  return (insideBrackets ? insideBrackets[1] : value).trim().toLowerCase();
}

export function parseAddressList(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(/[,;]/)
    .map((item) => normalizeAddress(item))
    .filter((item) => item.includes("@"));
}

export type MailAcceptance = {
  mainAccepted: boolean;
  mainRejected: boolean;
  ccStatus: "none" | "sent" | "failed";
  ccRejectedCount: number;
  acceptedCount: number;
  rejectedCount: number;
};

export function evaluateMailAcceptance(
  result: Pick<MailSendResult, "accepted" | "rejected">,
  to: string,
  cc?: string,
): MailAcceptance {
  const accepted = new Set(result.accepted.map(normalizeAddress));
  const rejected = new Set(result.rejected.map(normalizeAddress));

  const mainAddress = normalizeAddress(to);
  const mainRejected = rejected.has(mainAddress);
  // Alguns transports não devolvem `accepted`; nesse caso, a ausência de
  // rejeição explícita é o sinal disponível.
  const mainAccepted = accepted.size === 0 ? !mainRejected : accepted.has(mainAddress);

  const ccAddresses = parseAddressList(cc);
  const ccRejected = ccAddresses.filter((address) => rejected.has(address));
  const ccStatus: MailAcceptance["ccStatus"] =
    ccAddresses.length === 0 ? "none" : ccRejected.length ? "failed" : "sent";

  return {
    mainAccepted,
    mainRejected,
    ccStatus,
    ccRejectedCount: ccRejected.length,
    acceptedCount: accepted.size,
    rejectedCount: rejected.size,
  };
}
