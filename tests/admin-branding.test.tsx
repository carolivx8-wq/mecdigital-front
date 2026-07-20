import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/AdminPanel";
import { BrandHeader } from "@/components/BrandHeader";

const signInWithPassword = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword
    }
  })
}));

afterEach(() => {
  vi.restoreAllMocks();
  signInWithPassword.mockReset();
});

describe("admin login safety", () => {
  it("never places credentials in a native HTML form", async () => {
    signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error("invalid") });
    render(<AdminPanel />);
    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.closest("form")).toBeNull();
    await userEvent.type(screen.getByLabelText("E-mail"), "admin@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "secret-value");
    await userEvent.click(button);
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "admin@example.com", password: "secret-value" });
  });
});

describe("configurable brand", () => {
  it("leaves the brand area blank when no logo is configured", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 }));
    render(<BrandHeader />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: /MecDigital/i })).not.toBeInTheDocument();
    expect(screen.queryByText("MecDigital")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "MecDigital" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("link", { name: "Consulta" })).toHaveAttribute("href", "/registro/consulta");
  });

  it("replaces the textual brand when a logo is configured", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ data: { logoUrl: "https://cdn.example/logo.png", logoLink: "https://example.com/destino" } }), { status: 200 }));
    render(<BrandHeader />);
    await waitFor(() => expect(screen.getByRole("img", { name: "MecDigital" })).toHaveAttribute("src", "https://cdn.example/logo.png"));
    expect(screen.getByRole("link", { name: "Acessar o site configurado para a marca" })).toHaveAttribute("href", "https://example.com/destino");
  });
});
