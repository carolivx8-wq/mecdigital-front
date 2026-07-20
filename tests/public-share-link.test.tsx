import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicLookup } from "@/components/PublicLookup";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("public shared link", () => {
  it("resolves the fragment by POST, removes it from the URL and does not ask for a protocol", async () => {
    const token = "A".repeat(43);
    window.history.replaceState(null, "", `/registro/compartilhado#${token}`);
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: {
      consultedAt: "2026-07-20T12:00:00.000Z",
      student: { name: "Ana Souza", birthDate: "1990-01-01", documentType: "RG", documentNumber: "123456", documents: [], motherName: null, fatherName: null, educationLevel: "Superior", completionDate: "2025-01-01", notes: null, profilePhotoUrl: "https://example.com/foto.webp" },
      institution: { name: "Instituição Exemplo", creationAct: null, publicationText: null },
      downloads: { pdf: "blocked", xml: "blocked" }
    } }), { status: 200 }));

    render(<PublicLookup direct />);

    expect(await screen.findByText("Registro validado via QR Code")).toBeInTheDocument();
    expect(screen.getByText("Este registro foi aberto por um QR Code autorizado pela instituição. Confira abaixo os dados disponíveis para validação.")).toBeInTheDocument();
    expect(screen.queryByText("Consulta pública")).not.toBeInTheDocument();

    expect(screen.queryByLabelText(/número do protocolo/i)).not.toBeInTheDocument();
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto de perfil de Ana Souza" })).toHaveAttribute("width", "120");
    expect(screen.getByRole("img", { name: "Foto de perfil de Ana Souza" })).toHaveAttribute("height", "160");
    expect(screen.getByRole("button", { name: /Baixar em PDF/ })).toBeInTheDocument();
    expect(screen.getByText("Escolha o formato desejado para baixar o documento.")).toBeInTheDocument();
    expect(screen.queryByText("Escolha o formato desejado para solicitar o documento.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baixar em XML/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Baixar em PDF/ }));
    expect(await screen.findByRole("dialog", { name: "Registro bloqueado temporariamente!" })).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/public-links/resolve"), expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ token })
    }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("shows a safe error for a malformed link without calling the API", async () => {
    window.history.replaceState(null, "", "/registro/compartilhado#curto");
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<PublicLookup direct />);

    expect(await screen.findByText("Registro validado via QR Code")).toBeInTheDocument();
    expect(screen.getByText("Este registro foi aberto por um QR Code autorizado pela instituição. Confira abaixo os dados disponíveis para validação.")).toBeInTheDocument();
    expect(screen.queryByText("Consulta pública")).not.toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Link público inválido ou revogado.");
    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled());
  });
});
