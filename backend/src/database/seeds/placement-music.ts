import { EntityManager } from 'typeorm';
import { testCreationId } from '../../common/tests/test-creation';

/** Exact expanded-seed identities; titles are editable and never used as identity. */
export async function configureMusicPlacement(
  manager: EntityManager,
  apply = false,
) {
  const creators = await manager.query<Array<{ created_by: string }>>(
    'SELECT DISTINCT created_by FROM tests',
  );
  const components = [
    'GRAMMAR_VOCAB',
    'READING',
    'LISTENING',
    'WRITING',
    'SPEAKING',
  ];
  const matched: Array<{
    id: string;
    component: string;
    mode: string;
    family: string;
  }> = [];
  for (const { created_by } of creators)
    for (const component of components) {
      const family = testCreationId(
        created_by,
        component,
        'aptimate-expanded-tests-v1:form-5:placement-family',
      );
      const modes = [
        'full',
        ...Array.from(
          { length: component === 'GRAMMAR_VOCAB' ? 2 : 4 },
          (_, i) => 'part' + (i + 1),
        ),
      ];
      for (const purpose of ['EXAM', 'PRACTICE'])
        for (const mode of modes) {
          if (purpose === 'EXAM' && mode !== 'full') continue;
          const id = testCreationId(
            created_by,
            component,
            'aptimate-expanded-tests-v1:form-5:' +
              component +
              ':' +
              purpose +
              ':' +
              mode,
          );
          const [row] = await manager.query(
            'SELECT id,scope,is_placement,placement_family_id FROM tests WHERE id=$1 AND component=$2 AND archived_at IS NULL',
            [id, component],
          );
          if (!row) continue;
          // Preserve a seed that an administrator has changed to another scope or family.
          if (
            (row.scope === 'FULL_SKILL') !== (mode === 'full') ||
            (row.placement_family_id && row.placement_family_id !== family)
          )
            continue;
          matched.push({ id, component, mode, family });
          if (
            apply &&
            (!row.placement_family_id || (mode === 'full' && !row.is_placement))
          ) {
            await manager.query(
              'UPDATE tests SET placement_family_id=$2,is_placement=$3,version=version+1,updated_at=now() WHERE id=$1',
              [id, family, mode === 'full'],
            );
            await manager.query(
              "INSERT INTO audit_logs(action,entity_type,entity_id,changes) VALUES('PLACEMENT_MUSIC_CONFIGURED','TEST',$1,$2)",
              [
                id,
                {
                  before: {
                    isPlacement: row.is_placement,
                    family: row.placement_family_id,
                  },
                  after: { isPlacement: mode === 'full', family },
                },
              ],
            );
          }
        }
    }
  return {
    apply,
    full: matched.filter((t) => t.mode === 'full').length,
    parts: matched.filter((t) => t.mode !== 'full').length,
    matched,
  };
}
