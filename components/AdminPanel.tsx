"use client";

import { FormEvent, useEffect, useState } from "react";
import { createRecord, deleteBrandLogo, getBranding, listRecords, updateBrandLink, updateRecord, uploadBrandLogo } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { AdminRecord } from "@/lib/types";

const empty = { student_name: "", birth_date: "", document_type: "RG", document_number: "", mother_name: "", father_name: "", education_level: "", completion_date: "", notes: "", institution_name: "", institution_creation_act: "", publication_text: "" };

function recordToForm(record: AdminRecord) {
  return Object.fromEntries(Object.keys(empty).map((key) => [key, record[key as keyof AdminRecord] ?? ""]));
}

export function AdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [protocol, setProtocol] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoLink, setLogoLink] = useState("");
  const [activeTab, setActiveTab] = useState<"new" | "records" | "branding">("new");

  async function refresh(accessToken: string) {
    setRecords(await listRecords(accessToken));
  }

  useEffect(() => {
    let active = true;
    getBranding().then((branding) => { if (active) setLogoLink(branding.logoLink ?? ""); }).catch(() => undefined);
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => {
        const accessToken = data.session?.access_token;
        if (active && accessToken) { setToken(accessToken); refresh(accessToken).catch(() => setMessage("Não foi possível carregar os registros.")); }
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setToken(session?.access_token ?? null); });
      return () => { active = false; data.subscription.unsubscribe(); };
    } catch (error) { setMessage(error instanceof Error ? error.message : "Configuração indisponível."); }
  }, []);

  async function login() {
    setLoading(true); setMessage("");
    try {
      const { data: result, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error || !result.session) throw new Error("E-mail ou senha inválidos.");
      setToken(result.session.access_token); await refresh(result.session.access_token);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setLoading(false); }
  }

  async function saveLogo() {
    if (!token || !logoFile) return;
    setLoading(true); setMessage("");
    try {
      const branding = await uploadBrandLogo(token, logoFile);
      window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logoUrl: branding.logoUrl } }));
      setLogoFile(null); setMessage("Logo atualizada com sucesso.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar a logo."); }
    finally { setLoading(false); }
  }

  async function restoreLogo() {
    if (!token || !confirm("Restaurar a marca textual MecDigital?")) return;
    setLoading(true); setMessage("");
    try {
      await deleteBrandLogo(token);
      window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logoUrl: null } }));
      setLogoFile(null); setMessage("Marca textual restaurada.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nao foi possivel restaurar a marca."); }
    finally { setLoading(false); }
  }

  async function saveLogoLink() {
    if (!token) return;
    setLoading(true); setMessage("");
    try {
      const result = await updateBrandLink(token, logoLink.trim() || null);
      setLogoLink(result.logoLink ?? "");
      window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logoLink: result.logoLink } }));
      setMessage(result.logoLink ? "Link da logo atualizado." : "Link da logo removido.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o link."); }
    finally { setLoading(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token) return;
    setLoading(true); setMessage(""); setProtocol("");
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value === "" && ["mother_name", "father_name", "notes", "institution_creation_act", "publication_text"].includes(key) ? null : value]));
    try {
      if (editing) { await updateRecord(token, editing.id, body); setMessage("Registro atualizado com sucesso."); }
      else { const result = await createRecord(token, body); setProtocol(result.protocol); setMessage("Registro criado com sucesso. O protocolo também está disponível na aba Registros."); setActiveTab("records"); }
      setEditing(null); setFormVersion((value) => value + 1); await refresh(token);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setLoading(false); }
  }

  async function archive(record: AdminRecord) {
    if (!token || !confirm(`Arquivar o registro de ${record.student_name}?`)) return;
    await updateRecord(token, record.id, { status: "archived" }); await refresh(token);
  }

  async function copyProtocol(record: AdminRecord) {
    if (!record.protocol) { setMessage("Este registro foi criado antes da recuperação de protocolos e não possui uma cópia disponível."); return; }
    try {
      await navigator.clipboard.writeText(record.protocol);
      setMessage(`Protocolo de ${record.student_name} copiado.`);
    } catch { setMessage("Não foi possível copiar o protocolo. Tente novamente."); }
  }

  if (!token) return (
    <main className="admin-shell narrow">
      <div className="admin-card"><span className="eyebrow">Acesso restrito</span><h1>Painel administrativo</h1><p>Entre com o usuário criado no Supabase e promovido como administrador.</p>
        <div className="stack-form" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void login(); } }}>
          <label>E-mail<input name="email" type="email" autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></label>
          <button type="button" className="primary-button" disabled={loading || !loginEmail || !loginPassword} onClick={() => void login()}>{loading ? "Entrando…" : "Entrar"}</button>
        </div>
        {message && <div className="alert error" role="alert">{message}</div>}
      </div>
    </main>
  );

  const initial = editing ? recordToForm(editing) : empty;
  return (
    <main className="admin-shell">
      <div className="admin-title"><div><span className="eyebrow">Área administrativa</span><h1>Registros educacionais</h1></div><button className="text-button" onClick={() => getSupabaseBrowserClient().auth.signOut()}>Sair</button></div>
      {message && <div className="alert success" role="status">{message}{protocol && <code className="protocol-code">{protocol}</code>}</div>}
      <nav className="admin-tabs" aria-label="Seções do painel">
        <button type="button" className={activeTab === "new" ? "active" : ""} aria-current={activeTab === "new" ? "page" : undefined} onClick={() => setActiveTab("new")}>Novo registro</button>
        <button type="button" className={activeTab === "records" ? "active" : ""} aria-current={activeTab === "records" ? "page" : undefined} onClick={() => setActiveTab("records")}>Registros</button>
        <button type="button" className={activeTab === "branding" ? "active" : ""} aria-current={activeTab === "branding" ? "page" : undefined} onClick={() => setActiveTab("branding")}>Identidade visual</button>
      </nav>
      {activeTab === "branding" && <section className="admin-card branding-card">
        <div><h2>Identidade visual</h2><p>Substitua a marca “MecDigital” por uma imagem em todas as páginas.</p></div>
        <div className="branding-actions">
          <label className="file-field">Imagem da logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} /></label>
          <button type="button" className="primary-button" disabled={loading || !logoFile} onClick={() => void saveLogo()}>Salvar logo</button>
          <button type="button" className="secondary-button" disabled={loading} onClick={() => void restoreLogo()}>Restaurar padrão</button>
        </div>
        <div className="branding-link-row">
          <label>Link de destino da logo<input type="url" value={logoLink} onChange={(event) => setLogoLink(event.target.value)} placeholder="https://seusite.com.br" /></label>
          <button type="button" className="primary-button" disabled={loading} onClick={() => void saveLogoLink()}>Salvar link</button>
        </div>
        <small>PNG, JPG ou WebP, com no máximo 2 MB. Para melhor resultado, use uma imagem horizontal com fundo transparente.</small>
      </section>}
      {activeTab === "new" && <section className="admin-card"><h2>{editing ? "Editar registro" : "Novo registro"}</h2>
        <form key={`${editing?.id ?? "new"}-${formVersion}`} className="record-form" onSubmit={save}>
          <label className="wide">Nome do aluno<input name="student_name" defaultValue={String(initial.student_name)} required /></label>
          <label>Data de nascimento<input name="birth_date" type="date" defaultValue={String(initial.birth_date)} required /></label>
          <label>Tipo de documento<select name="document_type" defaultValue={String(initial.document_type)}><option>RG</option><option>RNE</option><option>CPF</option><option value="OTHER">Outro</option></select></label>
          <label>Número do documento<input name="document_number" defaultValue={String(initial.document_number)} required /></label>
          <label>Nome da mãe<input name="mother_name" defaultValue={String(initial.mother_name)} /></label>
          <label>Nome do pai<input name="father_name" defaultValue={String(initial.father_name)} /></label>
          <label>Nível de ensino<input name="education_level" defaultValue={String(initial.education_level)} required /></label>
          <label>Data de conclusão<input name="completion_date" type="date" defaultValue={String(initial.completion_date)} required /></label>
          <label className="wide">Nome da instituição<input name="institution_name" defaultValue={String(initial.institution_name)} required /></label>
          <label className="wide">Ato de criação<textarea name="institution_creation_act" defaultValue={String(initial.institution_creation_act)} /></label>
          <label className="wide">Publicação<textarea name="publication_text" defaultValue={String(initial.publication_text)} /></label>
          <label className="wide">Observações<textarea name="notes" defaultValue={String(initial.notes)} /></label>
          <div className="form-actions wide"><button className="primary-button" disabled={loading}>{loading ? "Salvando…" : editing ? "Salvar alterações" : "Criar e gerar protocolo"}</button>{editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setFormVersion((value) => value + 1); }}>Cancelar</button>}</div>
        </form>
      </section>}
      {activeTab === "records" && <section className="admin-card"><div className="section-title"><h2>Registros cadastrados</h2><span>{records.length} resultado(s)</span></div>
        <div className="table-wrap"><table><thead><tr><th>Aluno</th><th>Instituição</th><th>Conclusão</th><th>Status</th><th>Protocolo</th><th>Ações</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={6}>Nenhum registro cadastrado.</td></tr> : records.map((record) => <tr key={record.id}><td>{record.student_name}</td><td>{record.institution_name}</td><td>{new Date(`${record.completion_date}T00:00:00`).toLocaleDateString("pt-BR")}</td><td><span className={`status ${record.status}`}>{record.status === "active" ? "Ativo" : "Arquivado"}</span></td><td>{record.protocol ? <button className="copy-protocol" onClick={() => void copyProtocol(record)}>Copiar protocolo</button> : <span className="protocol-unavailable">Indisponível</span>}</td><td><button className="table-action" onClick={() => { setEditing(record); setActiveTab("new"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>{record.status === "active" && <button className="table-action danger" onClick={() => archive(record)}>Arquivar</button>}</td></tr>)}</tbody></table></div>
      </section>}
    </main>
  );
}
