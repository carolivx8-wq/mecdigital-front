import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/AdminPanel";

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: {
    getSession: async () => ({ data: { session: { access_token: "valid-token" } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signOut: vi.fn()
  } })
}));

afterEach(() => vi.restoreAllMocks());

describe("admin additional documents", () => {
  it("adds and removes optional document fields", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/v1/branding")) return new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 });
      if (url.includes("/api/v1/admin/records?")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AdminPanel />);
    const add = await screen.findByRole("button", { name: "Adicionar documento" });
    expect(screen.queryByLabelText("Tipo do documento adicional 1")).not.toBeInTheDocument();
    await userEvent.click(add);
    expect(screen.getByLabelText("Tipo do documento adicional 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Número do documento adicional 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover documento 1" }));
    expect(screen.queryByLabelText("Tipo do documento adicional 1")).not.toBeInTheDocument();
  });
});
