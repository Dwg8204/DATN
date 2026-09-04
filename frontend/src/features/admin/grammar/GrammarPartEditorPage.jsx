import { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MatchingSetEditor, MultipleChoiceQuestionEditor, QuestionGroup } from '../shared-test-builder/ObjectiveQuestionEditors';
import { AdminValidationToast } from '../components/AdminFeedback';
import { useGrammarTestBuilder } from './context/GrammarTestBuilderContext';
import { validateGrammarPart } from './data/grammarTestValidation';
import styles from './GrammarPartEditorPage.module.css';

export default function GrammarPartEditorPage() {
  const navigate = useNavigate();
  const { partNumber: raw } = useParams();
  const partNumber = Number(raw) === 2 ? 2 : 1;
  const { test, updatePart, basePath } = useGrammarTestBuilder();
  const [errors, setErrors] = useState([]);
  const close = () => navigate(basePath);
  const updateQuestion = (index, value) => {
    setErrors([]);
    updatePart(1, { ...test.parts[1], questions: test.parts[1].questions.map((question, current) => current === index ? value : question) });
  };
  const updateSet = (index, value) => {
    setErrors([]);
    updatePart(2, { ...test.parts[2], sets: test.parts[2].sets.map((set, current) => current === index ? value : set) });
  };
  const save = () => {
    const next = validateGrammarPart(partNumber, test.parts[partNumber]);
    setErrors(next);
    if (!next.length) close();
  };
  return <div className={styles.overlay}>
    <AdminValidationToast errors={errors} onClose={() => setErrors([])} />
    <button className={styles.close} onClick={close} aria-label="Close"><X /></button>
    <main>
      <header><strong>Part {partNumber}</strong><span>{partNumber === 1 ? 'Grammar multiple choice (25 questions. Choose A, B or C.)' : 'Vocabulary matching (5 sets. 25 questions.)'}</span></header>
      <div className={styles.intro}><h2>{partNumber === 1 ? 'Questions (Multiple Choice)' : 'Questions (Vocabulary Matching)'}</h2><p>{partNumber === 1 ? 'Enter each question, provide three different answer options and select exactly one correct answer.' : 'Each set must contain five different target words. A correct answer can be assigned to only one target within the same set.'}</p></div>
      <section className={styles.groups}>
        {partNumber === 1 ? Array.from({ length: 5 }, (_, group) => <QuestionGroup key={group} title={`Questions ${group * 5 + 1}–${group * 5 + 5}`} summary="Choose one correct answer from A, B or C" defaultOpen={group === 0}>{test.parts[1].questions.slice(group * 5, group * 5 + 5).map((question, index) => <MultipleChoiceQuestionEditor key={question.id} question={question} index={group * 5 + index} onChange={(value) => updateQuestion(group * 5 + index, value)} />)}</QuestionGroup>) : test.parts[2].sets.map((set, index) => <QuestionGroup key={set.setId} title={`Questions ${26 + index * 5}–${30 + index * 5}`} summary="Match target words with unique answers from the answer bank" defaultOpen={index === 0}><MatchingSetEditor set={set} index={index} onChange={(value) => updateSet(index, value)} /></QuestionGroup>)}
      </section>
    </main>
    <button className={styles.save} onClick={save}>Save change</button>
  </div>;
}
