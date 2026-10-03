import { createReadingDraft } from '../reading/data/readingTestModel.js';
import { createListeningDraft } from '../listening/data/listeningTestModel.js';
import { createSpeakingDraft } from '../speaking/data/speakingTestModel.js';
import { createWritingTestDraft } from '../writing/data/writingBuilderInitialState.js';
import { createGrammarTestDraft } from '../grammar/data/grammarTestData.js';
import { readingTestsApi } from '../reading/services/readingTestsApi.js';
import { listeningTestsApi } from '../listening/services/listeningTestsApi.js';
import { speakingTestsApi } from '../speaking/services/speakingTestsApi.js';
import { writingTestsApi } from '../writing/services/writingTestsApi.js';
import { grammarTestsApi, grammarMediaApi } from '../grammar/services/grammarTestsApi.js';
import { uploadPendingMedia } from './builderMedia.js';

export const builderConfigs = {
  reading: {
    create: createReadingDraft, load: readingTestsApi.getOne,
    save: test => test.id ? readingTestsApi.update(test.id, test) : readingTestsApi.create(test),
    publish: test => readingTestsApi.publish(test.id, test.version),
  },
  listening: {
    create: createListeningDraft, load: listeningTestsApi.getAdmin,
    save: async test => {
      const prepared = await uploadPendingMedia(test, { audio: listeningTestsApi.uploadAudio });
      return prepared.id ? listeningTestsApi.update(prepared) : listeningTestsApi.create(prepared);
    },
    publish: listeningTestsApi.publish,
  },
  speaking: {
    create: createSpeakingDraft, load: speakingTestsApi.getOne,
    save: test => {
      const payload = { ...(!test.id && test.creationRequestId ? { creationRequestId: test.creationRequestId } : {}), purpose: test.purpose, mode: test.mode, details: test.details, parts: test.parts, version: test.version };
      return test.id ? speakingTestsApi.update(test.id, payload) : speakingTestsApi.create(payload);
    },
    publish: test => speakingTestsApi.publish(test.id, test.version),
  },
  writing: {
    create: createWritingTestDraft, load: writingTestsApi.getAdmin,
    save: async test => {
      const prepared = await uploadPendingMedia(test, { cover: writingTestsApi.uploadCover });
      return prepared.id ? writingTestsApi.update(prepared) : writingTestsApi.create(prepared);
    },
    publish: writingTestsApi.publish,
  },
  grammar: {
    create: createGrammarTestDraft, load: grammarTestsApi.getAdmin,
    save: async test => {
      const prepared = await uploadPendingMedia(test, { cover: grammarMediaApi.uploadCover });
      return prepared.id ? grammarTestsApi.update(prepared) : grammarTestsApi.create(prepared);
    },
    publish: grammarTestsApi.publish,
  },
};

export function normalizeBuilderTest(skill, value) {
  const purpose = value.purpose || (value.mode === 'full' ? 'EXAM' : 'PRACTICE');
  const initial = builderConfigs[skill].create(value.mode, purpose);
  const assertShape = (actual, expected) => {
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) throw new Error('The saved draft has an invalid collection. It has been preserved on this device.');
      actual.forEach(item => assertShape(item, expected[0]));
    } else if (expected && typeof expected === 'object') {
      if (!actual || typeof actual !== 'object' || Array.isArray(actual)) throw new Error('Unable to read the saved draft. It has been preserved on this device.');
      for (const [key, template] of Object.entries(expected)) {
        if (Array.isArray(template) || actual[key] !== undefined) assertShape(actual[key], template);
      }
    } else if (typeof expected === 'string' && actual != null && typeof actual !== 'string') {
      throw new Error('The saved draft contains invalid text. It has been preserved on this device.');
    }
  };
  // Older Reading Part 2 records use one sentences collection instead of two texts.
  const template = skill === 'reading' && value.part2 && !value.part2.texts && value.part2.sentences
    ? { ...initial, part2: { sentences: initial.part2.texts[0].sentences } } : initial;
  assertShape(value, template);
  return { ...initial, ...value, purpose, details: { ...initial.details, ...value.details },
    ...(initial.parts ? { parts: { ...initial.parts, ...value.parts } } : {}) };
}
