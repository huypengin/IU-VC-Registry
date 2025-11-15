export type SubjectTemplateFieldType = 'text' | 'number' | 'select' | 'boolean';

export interface SubjectTemplateField {
  key: string;
  label: string;
  type: SubjectTemplateFieldType;
  required?: boolean;
  options?: string[];
}

export type SubjectTemplateStatus = 'draft' | 'published';

export interface SubjectTemplate {
  id: string;
  name: string;
  description?: string;
  fields: SubjectTemplateField[];
  version: string;
  status: SubjectTemplateStatus;
}
