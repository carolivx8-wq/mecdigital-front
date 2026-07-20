export interface PublicRecord {
  consultedAt?: string;
  student: {
    name: string;
    birthDate: string;
    documentType: string;
    documentNumber: string;
    documents?: Array<{ type: "RG" | "RNE" | "CPF" | "OTHER"; number: string }>;
    motherName: string | null;
    fatherName: string | null;
    educationLevel: string;
    completionDate: string;
    notes: string | null;
  };
  institution: { name: string; creationAct: string | null; publicationText: string | null };
  downloads: { pdf: "blocked"; xml: "blocked" };
}

export interface AdminRecord {
  id: string;
  protocol: string | null;
  status: "active" | "archived";
  student_name: string;
  birth_date: string;
  document_type: "RG" | "RNE" | "CPF" | "OTHER";
  document_number: string;
  additional_documents?: Array<{ document_type: "RG" | "RNE" | "CPF" | "OTHER"; document_number: string }>;
  mother_name: string | null;
  father_name: string | null;
  education_level: string;
  completion_date: string;
  notes: string | null;
  institution_name: string;
  institution_creation_act: string | null;
  publication_text: string | null;
  created_at: string;
}
