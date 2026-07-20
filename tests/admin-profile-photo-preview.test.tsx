import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPanel } from "@/components/AdminPanel";

const record = {
  id: "6d08350c-5263-4d83-9471-4b5f25246eef",
  protocol: "MEC-0123456789ABCDEF01234567",
  publicLink: null,
  publicLinkAvailable: true,
  profilePhotoUrl: "https://example.com/profile.webp",
  status: "active",
  student_name: "Ana Souza",
  birth_date: "1990-01-01",
  document_type: "RG",
  document_number: "123456",
  additional_documents: [],
  mother_name: null,
  father_name: null,
  education_level: "Superior",
  completion_date: "2025-01-01",
  notes: null,
  institution_name: "Institui??o Exemplo",
  institution_creation_act: null,
  publication_text: null,
  created_at: "2026-07-20T00:00:00.000Z"
};

vi.mock("@/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: {
    getSession: async () => ({ data: { session: { access_token: "valid-token" } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signOut: vi.fn()
  } })
}));

afterEach(() => vi.restoreAllMocks());

describe("admin profile photo preview", () => {
  it("shows the existing profile photo as a 3x4 image while editing", async () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/v1/branding")) return new Response(JSON.stringify({ data: { logoUrl: null, logoLink: null } }), { status: 200 });
      if (url.includes("/api/v1/admin/records?")) return new Response(JSON.stringify({ data: [record] }), { status: 200 });
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AdminPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Registros" }));
    await userEvent.click(await screen.findByRole("button", { name: /do registro de Ana Souza/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));

    const preview = await screen.findByRole("img", { name: /foto de perfil/i });
    expect(preview).toHaveAttribute("width", "120");
    expect(preview).toHaveAttribute("height", "160");
    expect(preview).toHaveAttribute("src", record.profilePhotoUrl);
  });
});
