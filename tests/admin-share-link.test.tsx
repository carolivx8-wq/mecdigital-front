import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/AdminPanel";

const publicLink = `https://portal-mec.digital/registro/compartilhado#${"A".repeat(43)}`;
const record = {
  id: "6d08350c-5263-4d83-9471-4b5f25246eef", protocol: "MEC-0123456789ABCDEF01234567", publicLink: null, publicLinkAvailable: true, status: "active",
  student_name: "Ana Souza", birth_date: "1990-01-01", document_type: "RG", document_number: "123456",
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

describe("admin public link actions", () => {
  it("shares the exact persisted link and renders the matching QR", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/v1/branding")) return new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 });
      if (url.includes("/api/v1/admin/records?")) return new Response(JSON.stringify({ data: [record] }), { status: 200 });
      if (url.endsWith(`/api/v1/admin/records/${record.id}/public-link`) && init?.method === "PUT") return new Response(JSON.stringify({ data: { url: publicLink, createdAt: "2026-07-20T00:00:00.000Z" } }), { status: 200 });
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    const linkMenuTrigger = await screen.findByRole("button", { name: "Opções de link de Ana Souza" });
    await userEvent.click(linkMenuTrigger);
    fireEvent.scroll(await screen.findByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: "Compartilhar" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Ver QR" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Revogar" })).toHaveFocus();
    await userEvent.keyboard("{Home}{Escape}");
    expect(linkMenuTrigger).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await userEvent.click(linkMenuTrigger);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Compartilhar" }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: publicLink }));
    await userEvent.click(screen.getByRole("button", { name: "Opções de link de Ana Souza" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Ver QR" }));
    expect(await screen.findByRole("dialog", { name: "QR code do registro" })).toBeInTheDocument();
    expect(screen.getByTitle("QR code do registro de Ana Souza")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Link público do registro" })).toHaveValue(publicLink);
    expect(screen.getByRole("link", { name: "Abrir link" })).toHaveAttribute("href", publicLink);
    await userEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(writeText).toHaveBeenCalledWith(publicLink);
    expect(await screen.findByRole("status")).toHaveTextContent("Link de Ana Souza copiado.");
  });
});
