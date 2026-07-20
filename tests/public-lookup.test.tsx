import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicLookup } from "@/components/PublicLookup";

const record = {
  student: { name: "Samara Maria Teixeira Fernandes", birthDate: "1979-03-16", documentType: "RG", documentNumber: "35383438", motherName: "Zilma Teixeira de Farias", fatherName: "Paulo Fernandes de Farias", educationLevel: "Enfermagem", completionDate: "2025-12-19", notes: "APROVADO" },
  institution: { name: "Universidade Exemplo", creationAct: "Decreto 123", publicationText: "Publicação processada" },
  downloads: { pdf: "blocked", xml: "blocked" },
  blocked: false,
  consultedAt: "2026-07-19T15:42:30.000Z"
};

afterEach(() => vi.restoreAllMocks());

describe("PublicLookup", () => {
  it("shows a clear error without calling the API when the protocol format is invalid", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<PublicLookup />);
    await userEvent.type(screen.getByLabelText(/número do protocolo/i), "protocolo errado");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Protocolo inválido");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows a not-found error for a well-formed unknown protocol", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "PROTOCOL_NOT_FOUND", message: "Protocolo não encontrado." } }), { status: 404 }));
    render(<PublicLookup />);
    await userEvent.type(screen.getByLabelText(/número do protocolo/i), "MEC-AAAAAAAAAAAAAAAAAAAAAAAA");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Protocolo não encontrado");
  });

  it("renders the full approved result, consultation date and the two document actions", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ data: record }), { status: 200 }));
    render(<PublicLookup />);
    await userEvent.type(screen.getByLabelText("Número do protocolo"), "MEC-0123456789ABCDEF01234567");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(await screen.findByText("Samara Maria Teixeira Fernandes")).toBeInTheDocument();
    expect(screen.getByText(/consulta realizada em/i).closest("p")).toHaveTextContent("19/07/2026");
    expect(screen.getByText(/consulta realizada em/i).compareDocumentPosition(screen.getByRole("button", { name: /baixar em pdf/i }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText("35383438")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /baixar em pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /baixar em xml/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voltar ao topo/i })).toHaveAttribute("href", "#conteudo");
    expect(screen.queryByText(/\*\*\*/)).not.toBeInTheDocument();
  });

  it("shows the blocked protocol dialog after a download attempt", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: record }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "PROTOCOL_BLOCKED", message: "Protocolo bloqueado temporariamente! Consulte sua instituição!" } }), { status: 423 }));
    render(<PublicLookup />);
    await userEvent.type(screen.getByLabelText(/número do protocolo/i), "MEC-0123456789ABCDEF01234567");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    await userEvent.click(await screen.findByRole("button", { name: /baixar em pdf/i }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Protocolo bloqueado temporariamente");
  });

  it("blocks record data and keeps the warning open when the backdrop is clicked", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "PROTOCOL_BLOCKED", message: "Protocolo bloqueado temporariamente!" } }), { status: 423 }));
    render(<PublicLookup />);
    await userEvent.type(screen.getByLabelText("Número do protocolo"), "MEC-0123456789ABCDEF01234567");
    await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Protocolo bloqueado temporariamente");
    await userEvent.click(screen.getByRole("presentation"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("Samara Maria Teixeira Fernandes")).not.toBeInTheDocument();
  });
});
