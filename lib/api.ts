import type { AdminRecord, PublicRecord } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload?.error?.code ?? "REQUEST_FAILED", payload?.error?.message ?? "Não foi possível concluir a solicitação.");
  return payload;
}

export async function lookupProtocol(protocol: string): Promise<PublicRecord> {
  const payload = await call<{ data: PublicRecord }>("/api/v1/protocols/lookup", { method: "POST", body: JSON.stringify({ protocol }) });
  return payload.data;
}

export async function attemptDownload(protocol: string, format: "pdf" | "xml") {
  return call("/api/v1/protocols/download-attempt", { method: "POST", body: JSON.stringify({ protocol, format }) });
}

export async function getBranding(): Promise<{ logoUrl: string | null; logoLink: string | null }> {
  const payload = await call<{ data: { logoUrl: string | null; logoLink: string | null } }>("/api/v1/branding");
  return payload.data;
}

function adminHeaders(token: string) { return { authorization: `Bearer ${token}` }; }

export async function uploadBrandLogo(token: string, file: File): Promise<{ logoUrl: string }> {
  const response = await fetch(`${API_URL}/api/v1/admin/branding/logo`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": file.type },
    body: file
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload?.error?.code ?? "UPLOAD_FAILED", payload?.error?.message ?? "Nao foi possivel enviar a imagem.");
  return payload.data;
}

export async function deleteBrandLogo(token: string): Promise<void> {
  await call("/api/v1/admin/branding/logo", { method: "DELETE", headers: adminHeaders(token) });
}

export async function updateBrandLink(token: string, logoLink: string | null): Promise<{ logoLink: string | null }> {
  const payload = await call<{ data: { logoLink: string | null } }>("/api/v1/admin/branding/link", {
    method: "PUT",
    headers: adminHeaders(token),
    body: JSON.stringify({ logoLink })
  });
  return payload.data;
}

export async function listRecords(token: string): Promise<AdminRecord[]> {
  const payload = await call<{ data: AdminRecord[] }>("/api/v1/admin/records?pageSize=100", { headers: adminHeaders(token) });
  return payload.data;
}

export async function createRecord(token: string, body: Record<string, unknown>): Promise<{ record: AdminRecord; protocol: string }> {
  const payload = await call<{ data: { record: AdminRecord; protocol: string } }>("/api/v1/admin/records", { method: "POST", headers: adminHeaders(token), body: JSON.stringify(body) });
  return payload.data;
}

export async function updateRecord(token: string, id: string, body: Record<string, unknown>): Promise<AdminRecord> {
  const payload = await call<{ data: AdminRecord }>(`/api/v1/admin/records/${id}`, { method: "PATCH", headers: adminHeaders(token), body: JSON.stringify(body) });
  return payload.data;
}
