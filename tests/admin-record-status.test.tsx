import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/AdminPanel";

const record = {
  id: "6d08350c-5263-4d83-9471-4b5f25246eef", protocol: "MEC-0123456789ABCDEF01234567", status: "active",
  student_name: "Samara Maria Teixeira Fernandes", birth_date: "1979-03-16", document_type: "RG", document_number: "35383438",
  mother_name: "Zilma Teixeira de Farias", father_name: "Paulo Fernandes de Farias", education_level: "Enfermagem", completion_date: "2025-12-19",
  notes: null, institution_name: "Universidade Exemplo", institution_creation_act: null, publication_text: null, created_at: "2026-07-18T00:00:00.000Z"
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: {
    getSession: async () => ({ data: { session: { access_token: "valid-token" } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signOut: vi.fn()
  } })
}));

afterEach(() => vi.restoreAllMocks());

describe("admin record status", () => {
  it("blocks and unblocks a record using the existing status contract", async () => {
    let status: "active" | "archived" = "active";
    vi.spyOn(global, "confirm").mockReturnValue(true);
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/v1/branding")) return new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 });
      if (url.includes("/api/v1/admin/records?") && (!init?.method || init.method === "GET")) return new Response(JSON.stringify({ data: [{ ...record, status }] }), { status: 200 });
      if (url.endsWith(`/api/v1/admin/records/${record.id}`) && init?.method === "PATCH") {
        status = JSON.parse(String(init.body)).status;
        return new Response(JSON.stringify({ data: { ...record, status } }), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    await userEvent.click(await screen.findByRole("button", { name: "Bloquear" }));
    expect(await screen.findByText("Bloqueado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
    await waitFor(() => expect(screen.getByText("Ativo")).toBeInTheDocument());
  });

  it("shows the API error and keeps the record active when blocking fails", async () => {
    vi.spyOn(global, "confirm").mockReturnValue(true);
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/v1/branding")) return new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 });
      if (url.includes("/api/v1/admin/records?") && (!init?.method || init.method === "GET")) return new Response(JSON.stringify({ data: [record] }), { status: 200 });
      if (url.endsWith(`/api/v1/admin/records/${record.id}`) && init?.method === "PATCH") {
        return new Response(JSON.stringify({ error: { code: "UPDATE_FAILED", message: "Não foi possível bloquear o registro." } }), { status: 500 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    await userEvent.click(await screen.findByRole("button", { name: "Bloquear" }));
    expect(await screen.findByText("Não foi possível bloquear o registro.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("alert", "error");
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bloquear" })).toBeEnabled();
  });

  it("disables the status action while the update is pending", async () => {
    let releasePatch: (() => void) | undefined;
    let patchCalls = 0;
    let status: "active" | "archived" = "active";
    vi.spyOn(global, "confirm").mockReturnValue(true);
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/v1/branding")) return new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 });
      if (url.includes("/api/v1/admin/records?") && (!init?.method || init.method === "GET")) return new Response(JSON.stringify({ data: [{ ...record, status }] }), { status: 200 });
      if (url.endsWith(`/api/v1/admin/records/${record.id}`) && init?.method === "PATCH") {
        patchCalls += 1;
        await new Promise<void>((resolve) => { releasePatch = resolve; });
        status = "archived";
        return new Response(JSON.stringify({ data: { ...record, status } }), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    const action = await screen.findByRole("button", { name: "Bloquear" });
    await userEvent.click(action);
    expect(action).toBeDisabled();
    await userEvent.click(action);
    expect(patchCalls).toBe(1);
    releasePatch?.();
    await waitFor(() => expect(screen.getByText("Bloqueado")).toBeInTheDocument());
  });
});
