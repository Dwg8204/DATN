import { writingFixture } from '../writing-assessment/testing/writing.fixture';
import { groqEvidenceCatalog, groqEvidenceSchema, resolveGroqEvidence } from './writing-evidence.policy';
import { JsonSchema } from '../../common/ai/ai-provider.interface';
import { groundedGroqSchema } from './groq-reference.provider';

describe('Groq evidence IDs',()=>{
  const schema:JsonSchema={type:'object',properties:{questionKey:{type:'string'},quote:{type:'string',nullable:true}},required:['questionKey','quote']};
  it('resolves exact original text and rejects evidence belonging to another question',()=>{
    const {input}=writingFixture(1);
    input.parts[0].questions[0].response='I  went to school.';
    const catalog=groqEvidenceCatalog(input);
    const first=catalog[0], other=catalog.find(e=>e.questionKey!==first.questionKey)!;
    expect(resolveGroqEvidence({questionKey:first.questionKey,evidenceId:first.id},schema,catalog)).toEqual({questionKey:first.questionKey,quote:'I  went to school.'});
    expect(()=>resolveGroqEvidence({questionKey:first.questionKey,evidenceId:other.id},schema,catalog)).toThrow('AI_WRITING_EVIDENCE_INVALID');
    expect(()=>resolveGroqEvidence({questionKey:first.questionKey,evidenceId:'invented'},schema,catalog)).toThrow('AI_WRITING_EVIDENCE_INVALID');
    expect(resolveGroqEvidence({questionKey:first.questionKey,evidenceId:null},schema,catalog)).toEqual({questionKey:first.questionKey,quote:null});
    expect(groqEvidenceSchema(schema,catalog).properties!.evidenceId.enum).toContain(first.id);
    const wire:any=groundedGroqSchema(groqEvidenceSchema(schema,catalog),{evidenceCatalog:catalog});
    expect(wire.properties.evidenceId.$ref).toBe('#/$defs/optionalEvidenceId');
    expect(wire.$defs.optionalEvidenceId.enum).toContain(null);
    expect(catalog.every(e=>e.text.length<=160)).toBe(true);
  });
});
