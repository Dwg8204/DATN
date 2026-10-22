import api from '../../../services/api.js';
import { applyReferencePart, applyReferenceSummary } from '../utils/referenceAssessmentPresentation.js';

export const referenceAssessmentsApi={
  get:(id,signal)=>api.get(`/reference-assessments/${encodeURIComponent(id)}`,{signal,notifyOnError:false}).then(response=>response.data),
  retry:id=>api.post(`/reference-assessments/${encodeURIComponent(id)}/retry`,{}, {notifyOnError:false}).then(response=>response.data),
};
const cache=new WeakMap();
export function selectAssessmentApi(primaryApi,model) {
  if(model!=='groq') return primaryApi;
  if(!cache.has(primaryApi)) cache.set(primaryApi,createReferenceAttemptsApi(primaryApi));
  return cache.get(primaryApi);
}
export function createReferenceAttemptsApi(primaryApi) {
  return {assessmentProvider:'groq',
    async result(id,signal) {
      const [primary,reference]=await Promise.all([primaryApi.result(id,signal),referenceAssessmentsApi.get(id,signal)]);
      if(reference.component!==primary.component) throw new Error('Groq assessment does not match the attempt.');
      return applyReferenceSummary(primary,reference);
    },
    async partResult(id,part,signal) {
      const [original,reference]=await Promise.all([primaryApi.partResult(id,part,signal),referenceAssessmentsApi.get(id,signal)]);
      if(reference.component!==original.component) throw new Error('Groq assessment does not match the skill.');
      return applyReferencePart(original,reference);
    },
  };
}
