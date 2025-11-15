import { SubjectTemplate } from '../types/subject';

/**
 * SubjectService mirrors the structure of the existing context/schema services.
 * It exposes a simple API for retrieving subject templates. The implementation
 * is intentionally light-weight so that future integrations can replace the
 * in-memory store with database-backed storage without changing call-sites.
 */
export class SubjectService {
  private readonly templates: SubjectTemplate[];

  constructor() {
    this.templates = [
      {
        id: 'default-subject-template',
        name: 'Default subject template',
        description:
          'Placeholder template illustrating how subject schemas will be provided.',
        fields: [
          { key: 'subjectId', label: 'Subject identifier', type: 'text', required: true },
          { key: 'displayName', label: 'Display name', type: 'text' },
          { key: 'isTestSubject', label: 'Is test subject?', type: 'boolean' }
        ],
        version: '0.0.0',
        status: 'draft'
      }
    ];
  }

  async listTemplates(): Promise<SubjectTemplate[]> {
    return this.templates;
  }

  async getTemplate(id: string): Promise<SubjectTemplate | undefined> {
    return this.templates.find((template) => template.id === id);
  }
}

export const subjectService = new SubjectService();
