import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { InstitutionType } from './dto/list-institutions.dto';
import { INSTITUTION_TYPES, ListInstitutionsDto } from './dto/list-institutions.dto';

export type Institution = {
  id: string;
  name: string;
  shortName?: string;
  compeCode?: string;
  ispb?: string;
  type: InstitutionType;
  icon: string;
  active: boolean;
};

@Injectable()
export class InstitutionsService {
  private readonly institutions = this.loadInstitutions();
  private readonly institutionsById = new Map(
    this.institutions.map((institution) => [institution.id, institution]),
  );

  list(query: ListInstitutionsDto) {
    const search = query.search?.trim().toLowerCase();
    const includeInactive = query.includeInactive === 'true';

    return this.institutions
      .filter((institution) => includeInactive || institution.active)
      .filter((institution) => !query.type || institution.type === query.type)
      .filter((institution) => {
        if (!search) return true;

        return [institution.name, institution.shortName, institution.compeCode, institution.ispb]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(search));
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  exists(id: string) {
    const institution = this.institutionsById.get(id);
    return Boolean(institution?.active);
  }

  private loadInstitutions(): Institution[] {
    const filePath = join(__dirname, 'data', 'br-institutions.json');
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Institution[];

    return parsed.map((institution) => {
      if (!INSTITUTION_TYPES.includes(institution.type)) {
        throw new Error(`Invalid institution type for ${institution.id}`);
      }

      return institution;
    });
  }
}
