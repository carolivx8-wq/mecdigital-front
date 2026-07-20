"use client";

import { FormEvent, useState } from "react";
import { ApiError, attemptDownload, lookupProtocol } from "@/lib/api";
import type { PublicRecord } from "@/lib/types";

function DataLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <p><strong>{label}:</strong> {value}</p>;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatConsultedAt(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

export function PublicLookup() {
  const [protocol, setProtocol] = useState("");
  const [record, setRecord] = useState<PublicRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const documents = record?.student.documents?.length
    ? record.student.documents
    : record ? [{ type: record.student.documentType, number: record.student.documentNumber }] : [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage(""); setRecord(null); setModalOpen(false);
    const normalizedProtocol = protocol.trim().toUpperCase();
    if (!/^MEC-[A-Z0-9]{24}$/.test(normalizedProtocol)) {
      setMessage("Protocolo inválido. Confira o código informado.");
      setLoading(false);
      return;
    }
    try {
      const foundRecord = await lookupProtocol(normalizedProtocol);
      setRecord(foundRecord);
    }
    catch (error) {
      if (error instanceof ApiError && error.code === "PROTOCOL_BLOCKED") setModalOpen(true);
      else setMessage(error instanceof ApiError && error.code === "PROTOCOL_NOT_FOUND" ? "Protocolo não encontrado. Confira o código informado." : error instanceof Error ? error.message : "Não foi possível consultar agora.");
    }
    finally { setLoading(false); }
  }

  async function download(format: "pdf" | "xml") {
    try { await attemptDownload(protocol.trim().toUpperCase(), format); }
    catch (error) {
      if (error instanceof ApiError && error.code === "PROTOCOL_BLOCKED") setModalOpen(true);
      else setMessage(error instanceof Error ? error.message : "Não foi possível concluir a solicitação.");
    }
  }

  return (
    <main id="conteudo" className="container public-main">
      <section className="lookup-hero" aria-labelledby="lookup-title">
        <span className="eyebrow">Consulta pública</span>
        <h1 id="lookup-title" className="lookup-title"><span>Valide seu registro com</span><small>número de protocolo</small></h1>
        <p>Digite o protocolo fornecido pela sua instituição para visualizar as informações disponíveis.</p>
        <form className="lookup-form" onSubmit={submit}>
          <label htmlFor="protocol">Número do protocolo</label>
          <div className="input-row">
            <input id="protocol" name="protocol" value={protocol} onChange={(event) => setProtocol(event.target.value)} placeholder="MEC-000000000000000000000000" autoComplete="off" required aria-describedby="protocol-help" />
            <button className="primary-button" disabled={loading}>{loading ? "Consultando…" : "Consultar"}</button>
          </div>
          <small id="protocol-help">O protocolo possui o prefixo MEC seguido de 24 caracteres.</small>
        </form>
        {message && <div className="alert error" role="alert">{message}</div>}
      </section>

      {record && (
        <section className="result" aria-live="polite">
          <div className="result-heading"><span className="status-dot" /> Registro localizado</div>
          <div className="record-grid">
            <article className="data-card">
              <h2>Dados do aluno</h2>
              <DataLine label="Nome" value={record.student.name} />
              <DataLine label="Data de nascimento" value={formatDate(record.student.birthDate)} />
              {documents.map((document, index) => (
                <DataLine key={`${document.type}-${index}`} label={document.type === "OTHER" ? "Outro documento" : document.type} value={document.number} />
              ))}
              <DataLine label="Nome da mãe" value={record.student.motherName} />
              <DataLine label="Nome do pai" value={record.student.fatherName} />
              <DataLine label="Nível de ensino" value={record.student.educationLevel} />
              <DataLine label="Data de conclusão" value={formatDate(record.student.completionDate)} />
              <DataLine label="Observações" value={record.student.notes} />
            </article>
            <article className="data-card">
              <h2>Dados da instituição</h2>
              <DataLine label="Nome da instituição" value={record.institution.name} />
              <DataLine label="Ato de criação" value={record.institution.creationAct} />
              <DataLine label="Publicação" value={record.institution.publicationText} />
            </article>
          </div>
          <div className="download-panel">
            <h2>Documentos digitais</h2>
            <p>Escolha o formato desejado para solicitar o documento.</p>
            <div className="download-actions">
              <button className="download-button" onClick={() => download("pdf")}><span>PDF</span> Baixar em PDF</button>
              <button className="download-button" onClick={() => download("xml")}><span>XML</span> Baixar em XML</button>
            </div>
            {record.consultedAt && <p className="consulted-at"><strong>Consulta realizada em:</strong> {formatConsultedAt(record.consultedAt)}</p>}
            <a className="back-to-top" href="#conteudo">↑ Voltar ao topo</a>
          </div>
        </section>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="blocked-title">
            <button className="modal-close" aria-label="Fechar mensagem" onClick={() => setModalOpen(false)}>×</button>
            <div className="modal-icon" aria-hidden="true">!</div>
            <h2 id="blocked-title">Protocolo bloqueado temporariamente!</h2>
            <p>Consulte sua instituição para obter mais informações.</p>
            <button className="primary-button" onClick={() => setModalOpen(false)}>Entendi</button>
          </section>
        </div>
      )}
    </main>
  );
}
