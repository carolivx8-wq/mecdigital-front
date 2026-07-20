"use client";

import { FormEvent, useEffect, useState } from "react";
import { createRecord, deleteBrandLogo, getBranding, listRecords, updateBrandLink, updateRecord, uploadBrandLogo } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { AdminRecord } from "@/lib/types";

const empty = { student_name: "", birth_date: "", document_type: "RG", document_number: "", mother_name: "", father_name: "", education_level: "", completion_date: "", notes: "", institution_name: "", institution_creation_act: "", publication_text: "" };
type AdditionalDocument = NonNullable<AdminRecord["additional_documents"]>[number];

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
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoLink, setLogoLink] = useState("");
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "records" | "branding">("new");
  const [additionalDocuments, setAdditionalDocuments] = useState<AdditionalDocument[]>([]);

  function clearMessage() { setMessage(""); setMessageKind("success"); }
  function showSuccess(text: string) { setMessage(text); setMessageKind("success"); }
  function showError(text: string) { setMessage(text); setMessageKind("error"); }

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
        if (active && accessToken) { setToken(accessToken); refresh(accessToken).catch(() => showError("Não foi possível carregar os registros.")); }
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setToken(session?.access_token ?? null); });
      return () => { active = false; data.subscription.unsubscribe(); };
    } catch (error) { showError(error instanceof Error ? error.message : "Configuração indisponível."); }
  }, []);

  async function login() {
    setLoading(true); clearMessage();
    try {
      const { data: result, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error || !result.session) throw new Error("E-mail ou senha inválidos.");
      setToken(result.session.access_token); await refresh(result.session.access_token);
    } catch (error) { showError(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setLoading(false); }
  }

  async function saveLogo() {
    if (!token || !logoFile) return;
    setLoading(true); clearMessage();
    try {
      const branding = await uploadBrandLogo(token, logoFile);
      window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logoUrl: branding.logoUrl } }));
      setLogoFile(null); showSuccess("Logo atualizada com sucesso.");
    } catch (error) { showError(error instanceof Error ? error.message : "Nao foi possivel atualizar a logo."); }
    finally { setLoading(false); }
  }

  async function restoreLogo() {
    if (!token || !confirm("Remover a logo atual? A área da marca ficará em branco.")) return;
    setLoading(true); clearMessage();
    try {
      await deleteBrandLogo(token);
      window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logoUrl: null } }));
      setLogoFile(null); showSuccess("Logo removida. A área da marca ficará em branco.");
    } catch (error) { showError(error instanceof Error ? error.message : "Nao foi possivel restaurar a marca."); }
    finally { setLoading(false); }
  }

  async function saveLogoLink() {
    if (!token) return;
    setLoading(true); clearMessage();
    try {
      const result = await updateBrandLink(token, logoLink.trim() || null);
      setLogoLink(result.logoLink ?? "");
      window.dispatchEvent(new CustomEvent("branding-updated", { detail: { logoLink: result.logoLink } }));
      showSuccess(result.logoLink ? "Link da logo atualizado." : "Link da logo removido.");
    } catch (error) { showError(error instanceof Error ? error.message : "Não foi possível atualizar o link."); }
    finally { setLoading(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token) return;
    setLoading(true); clearMessage(); setProtocol("");
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      ...Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value === "" && ["mother_name", "father_name", "notes", "institution_creation_act", "publication_text"].includes(key) ? null : value])),
      additional_documents: additionalDocuments
    };
    try {
      if (editing) { await updateRecord(token, editing.id, body); showSuccess("Registro atualizado com sucesso."); }
      else { const result = await createRecord(token, body); setProtocol(result.protocol); showSuccess("Registro criado com sucesso. O protocolo também está disponível na aba Registros."); setActiveTab("records"); }
      setEditing(null); setAdditionalDocuments([]); setFormVersion((value) => value + 1); await refresh(token);
    } catch (error) { showError(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setLoading(false); }
  }

  async function setRecordBlocked(record: AdminRecord, blocked: boolean) {
    if (!token || !confirm(`${blocked ? "Bloquear" : "Desbloquear"} o registro de ${record.student_name}?`)) return;
    setUpdatingRecordId(record.id); clearMessage();
    try {
      await updateRecord(token, record.id, { status: blocked ? "archived" : "active" });
      await refresh(token);
      showSuccess(`Registro de ${record.student_name} ${blocked ? "bloqueado" : "desbloqueado"} com sucesso.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível atualizar o status do registro.");
    } finally {
      setUpdatingRecordId(null);
    }
  }

  async function copyProtocol(record: AdminRecord) {
    if (!record.protocol) { showError("Este registro foi criado antes da recuperação de protocolos e não possui uma cópia disponível."); return; }
    try {
      await navigator.clipboard.writeText(record.protocol);
      showSuccess(`Protocolo de ${record.student_name} copiado.`);
    } catch { showError("Não foi possível copiar o protocolo. Tente novamente."); }
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
      {message && <div className={`alert ${messageKind}`} role={messageKind === "error" ? "alert" : "status"}>{message}{protocol && <code className="protocol-code">{protocol}</code>}</div>}
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
          <button type="button" className="secondary-button" disabled={loading} onClick={() => void restoreLogo()}>Remover logo</button>
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
          <div className="additional-documents wide">
            <div className="section-title">
              <h3>Documentos adicionais</h3>
              <button type="button" className="secondary-button" aria-label="Adicionar documento" disabled={additionalDocuments.length >= 9} onClick={() => setAdditionalDocuments((current) => [...current, { document_type: "RG", document_number: "" }])}>+ Adicionar documento</button>
            </div>
            {additionalDocuments.map((document, index) => (
              <div className="additional-document-row" key={index}>
                <label>Tipo do documento adicional {index + 1}
                  <select value={document.document_type} onChange={(event) => setAdditionalDocuments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, document_type: event.target.value as AdditionalDocument["document_type"] } : item))}>
                    <option>RG</option><option>RNE</option><option>CPF</option><option value="OTHER">Outro</option>
                  </select>
                </label>
                <label>Número do documento adicional {index + 1}
                  <input required value={document.document_number} onChange={(event) => setAdditionalDocuments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, document_number: event.target.value } : item))} />
                </label>
                <button type="button" className="text-button danger" aria-label={`Remover documento ${index + 1}`} onClick={() => setAdditionalDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</button>
              </div>
            ))}
          </div>
          <label>Nome da mãe<input name="mother_name" defaultValue={String(initial.mother_name)} /></label>
          <label>Nome do pai<input name="father_name" defaultValue={String(initial.father_name)} /></label>
          <label>Nível de ensino<input name="education_level" defaultValue={String(initial.education_level)} required /></label>
          <label>Data de conclusão<input name="completion_date" type="date" defaultValue={String(initial.completion_date)} required /></label>
          <label className="wide">Nome da instituição<input name="institution_name" defaultValue={String(initial.institution_name)} required /></label>
          <label className="wide">Ato de criação<textarea name="institution_creation_act" defaultValue={String(initial.institution_creation_act)} /></label>
          <label className="wide">Publicação<textarea name="publication_text" defaultValue={String(initial.publication_text)} /></label>
          <label className="wide">Observações<textarea name="notes" defaultValue={String(initial.notes)} /></label>
          <div className="form-actions wide"><button className="primary-button" disabled={loading}>{loading ? "Salvando…" : editing ? "Salvar alterações" : "Criar e gerar protocolo"}</button>{editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setAdditionalDocuments([]); setFormVersion((value) => value + 1); }}>Cancelar</button>}</div>
        </form>
      </section>}
      {activeTab === "records" && <section className="admin-card"><div className="section-title"><h2>Registros cadastrados</h2><span>{records.length} resultado(s)</span></div>
        <div className="table-wrap"><table><thead><tr><th>Aluno</th><th>Instituição</th><th>Conclusão</th><th>Status</th><th>Protocolo</th><th>Ações</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={6}>Nenhum registro cadastrado.</td></tr> : records.map((record) => <tr key={record.id}><td>{record.student_name}</td><td>{record.institution_name}</td><td>{new Date(`${record.completion_date}T00:00:00`).toLocaleDateString("pt-BR")}</td><td><span className={`status ${record.status}`}>{record.status === "active" ? "Ativo" : "Bloqueado"}</span></td><td>{record.protocol ? <button className="copy-protocol" onClick={() => void copyProtocol(record)}>Copiar protocolo</button> : <span className="protocol-unavailable">Indisponível</span>}</td><td><button className="table-action" onClick={() => { setEditing(record); setAdditionalDocuments(record.additional_documents ?? []); setActiveTab("new"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button className={`table-action ${record.status === "active" ? "danger" : ""}`} disabled={updatingRecordId === record.id} onClick={() => void setRecordBlocked(record, record.status === "active")}>{record.status === "active" ? "Bloquear" : "Desbloquear"}</button></td></tr>)}</tbody></table></div>
      </section>}
    </main>
  );
}
