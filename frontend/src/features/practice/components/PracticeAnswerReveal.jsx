import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import RichTextContent from '../../../components/common/RichTextContent.jsx';
import { useTestAttempt } from '../../test-attempts/context/testAttemptContextStore.js';
import styles from './PracticeAnswerReveal.module.css';
import { useTranslation } from 'react-i18next';

export default function PracticeAnswerReveal({ questionKey, options = [], inline = false }) {
  const { t } = useTranslation();
  const { isPractice, revealedAnswers, revealAnswer } = useTestAttempt();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  if (!isPractice || !questionKey) return null;
  const revealed = revealedAnswers?.[questionKey];
  const answerText = options.find(option => option.id === revealed?.correctAnswer)?.text ?? revealed?.correctAnswer;

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    if (!revealed) {
      setLoading(true);
      try { await revealAnswer(questionKey); } finally { setLoading(false); }
    }
    setExpanded(true);
  };

  return <div className={`${styles.reveal} ${inline ? styles.inlineReveal : ''}`}>
    <button type="button" onClick={() => void toggle()} disabled={loading}
      aria-expanded={expanded} title={expanded ? t('practice.hideAnswer') : t('practice.showAnswer')}>
      {expanded ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      <span>{loading ? t('common.loading') : expanded ? t('practice.hideAnswer') : t('practice.showAnswer')}</span>
    </button>
    {expanded && revealed && <aside className={styles.panel} aria-live="polite">
      {(answerText || revealed.sampleAnswer) && <div><strong>{revealed.sampleAnswer ? t('practice.sampleAnswer') : t('practice.correctAnswer')}</strong>
        <RichTextContent value={revealed.sampleAnswer || answerText} /></div>}
      {revealed.explanation && (inline ? <details className={styles.inlineExplanation}>
        <summary>{t('practice.explanation')}</summary>
        <div><RichTextContent value={revealed.explanation} /></div>
      </details> : <div><strong>{t('practice.explanation')}</strong><RichTextContent value={revealed.explanation} /></div>)}
      {!answerText && !revealed.sampleAnswer && !revealed.explanation && <p>{t('practice.noGuidance')}</p>}
    </aside>}
  </div>;
}
