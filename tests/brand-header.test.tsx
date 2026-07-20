import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandHeader } from "@/components/BrandHeader";

afterEach(() => vi.restoreAllMocks());

describe("BrandHeader", () => {
  it("renders the external menu and the local accessibility icon without a top stripe", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 }));
    const { container } = render(<BrandHeader />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(container.querySelector(".top-stripe")).toBeNull();
    expect(screen.getByRole("link", { name: "Simplifique" })).toHaveAttribute("href", "https://www.simplifique.gov.br/");
    expect(screen.getByRole("link", { name: "Participe" })).toHaveAttribute("href", "https://brasilparticipativo.presidencia.gov.br/");
    expect(screen.getByRole("link", { name: "Acesso à informação" })).toHaveAttribute("href", "https://informabr.cgu.gov.br/");
    expect(screen.getByRole("link", { name: "Legislação" })).toHaveAttribute("href", "https://www4.planalto.gov.br/legislacao");
    expect(screen.getByRole("link", { name: "Canais" })).toHaveAttribute("href", "https://www.gov.br/pt-br/canais-do-executivo-federal");
    const accessibility = screen.getByRole("link", { name: "Acessibilidade" });
    expect(accessibility).toHaveAttribute("href", "/acessibilidade");
    expect(accessibility.querySelector("img")).toHaveAttribute("src", "/accessibility-icon.svg");
  });
});

