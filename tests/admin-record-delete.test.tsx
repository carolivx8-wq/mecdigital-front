import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/AdminPanel";

const record = {
  id: "6d08350c-5263-4d83-9471-4b5f25246eef", protocol: "MEC-0123456789ABCDEF01234567", publicLink: null, publicLinkAvailable: false, profilePhotoUrl: null, status: "active",
  student_name: "Ana Souza", birth_date: "1990-01-01", document_type: "RG", document_number: "123456", additional_documents: [],
  mother_name: null, father_name: null, education_level: "Superior", completion_date: "2025-01-01",
  notes: null, institution_name: "Instituição Exemplo", institution_creation_act: null, publication_text: null, created_at: "2026-07-20T00:00:00.000Z"
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: {
    getSession: async () => ({ data: { session: { access_token: "valid-token" } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signOut: vi.fn()
  } })
}));

afterEach(() => vi.restoreAllMocks());

function mockRequests(deleteStatus = 204) {
  let listed = true;
  return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/v1/branding")) return new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 });
    if (url.includes("/api/v1/admin/records?")) return new Response(JSON.stringify({ data: listed ? [record] : [] }), { status: 200 });
    if (url.endsWith(`/api/v1/admin/records/${record.id}`) && init?.method === "DELETE") {
      if (deleteStatus === 204) { listed = false; return new Response(null, { status: 204 }); }
      return new Response(JSON.stringify({ error: { code: "DELETE_FAILED", message: "Falha ao excluir." } }), { status: deleteStatus });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe("admin record deletion", () => {
  it("does not delete when the permanent action is cancelled", async () => {
    const fetchMock = mockRequests();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith(`/records/${record.id}`) && init?.method === "DELETE")).toBe(false);
  });

  it("deletes after confirmation, refreshes the list and reports success", async () => {
    const fetchMock = mockRequests();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("status")).toHaveTextContent("excluído permanentemente");
    await waitFor(() => expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith(`/records/${record.id}`) && init?.method === "DELETE")).toHaveLength(1);
  });

  it("keeps the record and shows the API error when deletion fails", async () => {
    mockRequests(500);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao excluir.");
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
  });
});
