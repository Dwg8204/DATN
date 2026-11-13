import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Modal from "../../../components/common/Modal";
import { personalizationApi } from "../services/personalizationApi";
import { practiceAttemptsApi } from "../../test-attempts/services/practiceAttemptsApi";

const skills = {
  GRAMMAR_VOCAB: "grammar-vocab",
  READING: "reading",
  LISTENING: "listening",
  WRITING: "writing",
  SPEAKING: "speaking",
};
function LessonModal({ id, onClose }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    personalizationApi
      .knowledgeChunk(id)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <Modal title={t("personalization.grounding.lesson")} onClose={onClose}>
      {!data && !error && (
        <p role="status">{t("personalization.reportLoading")}</p>
      )}
      {error && (
        <p role="alert">{t("personalization.grounding.unavailable")}</p>
      )}
      {data && (
        <>
          <h3>{data.title}</h3>
          <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {data.content}
          </div>
        </>
      )}
    </Modal>
  );
}
export default function ReportEvidence({
  index,
  citations = [],
  sources = [],
  candidates = [],
}) {
  const { t } = useTranslation(),
    navigate = useNavigate();
  const [lesson, setLesson] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const open = async (candidate) => {
    const skill = skills[candidate.component];
    if (!skill || busy) return;
    if (candidate.purpose === "EXAM") {
      navigate(
        `/${skill}/introduction?testId=${encodeURIComponent(candidate.testId)}&mode=full`,
      );
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const attempt = await practiceAttemptsApi.start({
        testId: candidate.testId,
        attemptId: crypto.randomUUID(),
        mode: candidate.partNumber ? `part${candidate.partNumber}` : "full",
      });
      navigate(
        `/${skill}/test/${attempt.scope === "PART" ? `part${attempt.partNumber}` : "part1"}?attemptId=${encodeURIComponent(attempt.attemptId)}&practice=true`,
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
        overflowWrap: "anywhere",
      }}
    >
      {citations
        .filter((c) => c.nextStepIndex === index)
        .map((c, i) => {
          const source = sources.find((s) => s.chunkId === c.chunkId),
            candidate = candidates.find((s) => s.candidateId === c.candidateId);
          return c.chunkId ? (
            <button
              type="button"
              key={i}
              disabled={!source}
              onClick={() => setLesson(c.chunkId)}
            >
              {source
                ? t("personalization.grounding.lessonChip", {
                    title: source.title,
                  })
                : t("personalization.grounding.unavailable")}
            </button>
          ) : candidate ? (
            <button
              type="button"
              key={i}
              disabled={busy}
              onClick={() => open(candidate)}
            >
              {t("personalization.grounding.testChip", {
                title: candidate.title,
              })}
            </button>
          ) : null;
        })}
      {error && <p role="alert">{t("personalization.planFailed")}</p>}
      {lesson && (
        <LessonModal key={lesson} id={lesson} onClose={() => setLesson(null)} />
      )}
    </div>
  );
}
