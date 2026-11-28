import { withoutPartCefr, restorePartCefr } from './writing-part-output';
import { writingOutputSchema } from './writing-assessment.schema';
describe('PART provider contract',()=>{
  it('omits CEFR from the wire schema without mutating the persisted contract',()=>{
    const original=writingOutputSchema('PART');const wire=withoutPartCefr(original);
    expect(wire.properties?.cefr).toBeUndefined();expect(wire.required).not.toContain('cefr');
    expect(original.properties?.cefr).toBeDefined();
    expect(writingOutputSchema('FULL_SKILL').properties?.cefr).toBeDefined();
  });
  it('restores only deterministic metadata and preserves all findings',()=>{
    const value={summary:{overallComment:'Feedback'},details:{parts:[]}};
    expect(restorePartCefr(value)).toMatchObject({...value,cefr:{level:null,status:'NOT_APPLICABLE',reason:'PART_SCOPE'}});
    expect(value).not.toHaveProperty('cefr');
  });
});
