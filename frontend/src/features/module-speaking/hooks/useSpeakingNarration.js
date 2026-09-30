import { useEffect, useRef, useState } from 'react';
import { richTextToPlainText } from '../../../components/common/richText';

const spokenInMemory = new Set();
const textOf = value => richTextToPlainText(value || '').trim();

export default function useSpeakingNarration({ attemptId, partNumber, question, questionIndex, questionCount,
  testTitle, instruction, enabled }) {
  const [speakingFor, setSpeakingFor] = useState(null);
  const [needsGestureFor, setNeedsGestureFor] = useState(null);
  const timerRef = useRef(null);
  const questionKey = question?.key;
  const promptText = question ? [question.text, ...(question.prompts || []).map((prompt, index) =>
    `${index + 1}. ${prompt.text}`)].map(textOf).filter(Boolean).join('. ') : '';
  const storageKey = `aptimate.speaking.spoken.${attemptId}.${partNumber}.${questionKey}`;

  useEffect(() => {
    if (!enabled || !attemptId || !questionKey || !promptText || !('speechSynthesis' in window)) return undefined;
    if (spokenInMemory.has(storageKey) || window.sessionStorage.getItem(storageKey) === '1') return undefined;

    let disposed = false;
    let activeUtterance = null;
    const speech = window.speechSynthesis;
    const introduction = questionIndex === 0 ? [
      `Speaking. Part ${partNumber}.`, textOf(testTitle),
      `Question 1 of ${questionCount}.`, textOf(instruction),
    ].filter(Boolean) : [];
    const segments = [...introduction, promptText];
    const play = index => {
      if (disposed || index >= segments.length) { setSpeakingFor(null); return; }
      const utterance = new SpeechSynthesisUtterance(segments[index]);
      activeUtterance = utterance;
      utterance.lang = 'en-GB';
      utterance.rate = 1;
      utterance.onstart = () => {
        if (disposed) return;
        setSpeakingFor(storageKey);
        setNeedsGestureFor(null);
        if (index === segments.length - 1) {
          spokenInMemory.add(storageKey);
          try { window.sessionStorage.setItem(storageKey, '1'); } catch { /* Private browsing may disable storage. */ }
        }
      };
      utterance.onend = () => play(index + 1);
      utterance.onerror = () => { if (!disposed) { setSpeakingFor(null); setNeedsGestureFor(storageKey); } };
      speech.speak(utterance);
    };
    timerRef.current = window.setTimeout(() => { timerRef.current = null; play(0); }, 3000);
    return () => {
      disposed = true;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      if (activeUtterance) activeUtterance.onend = null;
      speech.cancel();
    };
  }, [enabled, attemptId, questionKey, promptText, questionIndex, questionCount, partNumber, testTitle, instruction, storageKey]);

  const stop = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeakingFor(null);
  };
  const retry = () => {
    if (!question || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(promptText);
    utterance.lang = 'en-GB';
    utterance.onstart = () => {
      setSpeakingFor(storageKey);
      setNeedsGestureFor(null);
      spokenInMemory.add(storageKey);
      try { window.sessionStorage.setItem(storageKey, '1'); } catch { /* Optional session memory. */ }
    };
    utterance.onend = () => setSpeakingFor(null);
    utterance.onerror = () => setSpeakingFor(null);
    window.speechSynthesis.speak(utterance);
  };
  return { speaking: speakingFor === storageKey, needsGesture: needsGestureFor === storageKey, stop, retry };
}
