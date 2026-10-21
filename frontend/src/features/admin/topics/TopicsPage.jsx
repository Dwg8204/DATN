import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Pagination from "../../../components/common/Pagination";
import { paginate } from "../../../components/common/paginationUtils";
import ConfirmModal from "../../../components/common/ConfirmModal";
import { topicsApi } from "./topicsApi";
import styles from "./TopicsPage.module.css";

const skills = ["GRAMMAR_VOCAB", "READING", "LISTENING", "WRITING", "SPEAKING"];
const empty = {
  code: "",
  name: "",
  description: "",
  component: "GRAMMAR_VOCAB",
  topicType: "KNOWLEDGE",
  isActive: true,
};
const questionContext = (question) =>
  question.part_contents?.sets?.find(
    (set) => set.groupKey === question.group_key,
  ) || question.part_contents;
const plain = (text) =>
  new DOMParser().parseFromString(String(text), "text/html").body.textContent ||
  "";
const readable = (value) =>
  value == null
    ? ""
    : typeof value !== "object"
      ? plain(value)
      : Array.isArray(value)
        ? value.map(readable).filter(Boolean).join("\n")
        : Object.entries(value)
            .filter(
              ([key]) =>
                ![
                  "id",
                  "textId",
                  "groupKey",
                  "schemaVersion",
                  "setId",
                ].includes(key),
            )
            .map(([, val]) => readable(val))
            .filter(Boolean)
            .join("\n");
const questionText = (q) =>
  readable(
    q.content?.text ?? q.content?.word ?? q.content?.statement ?? q.content,
  );
const answerText = (q) =>
  q.content?.options?.[q.correct_answer?.optionIndex] ??
  questionContext(q)?.options?.find((o) => o.label === q.correct_answer?.label)
    ?.text ??
  readable(q.correct_answer ?? q.sample_answer);
export default function TopicsPage({ review = false }) {
  const { t } = useTranslation();
  const tr = (k) => t(`topics.${k}`);
  const [detailId, setDetailId] = useState(null);
  const [deleteTopic, setDeleteTopic] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState("ALL");
  const [totalTests, setTotalTests] = useState(0);
  const [totalLabels, setTotalLabels] = useState(0);
  const [params, setParams] = useSearchParams();
  const component = params.get("component") || "",
    testId = params.get("testId") || "";
  const [topics, setTopics] = useState([]),
    [coverage, setCoverage] = useState([]),
    [tests, setTests] = useState([]);
  const [labels, setLabels] = useState([]),
    [questions, setQuestions] = useState([]),
    [form, setForm] = useState(empty),
    [editing, setEditing] = useState(null);
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [status, setStatus] = useState("SUGGESTED"),
    [changes, setChanges] = useState({}),
    [confirm, setConfirm] = useState(null),
    [manual, setManual] = useState({ questionId: "", topicId: "" });
  const [progress, setProgress] = useState(null),
    [progressError, setProgressError] = useState(false),
    [queuedCount, setQueuedCount] = useState(null);
  const [confirmTest, setConfirmTest] = useState(null),
    [approvalResult, setApprovalResult] = useState(null);
  const work = params.get("work") || "ALL",
    reviewFilter = params.get("reviewFilter") || "ALL";
  const search = params.get("q") || "";
  const positiveInt = (key, fallback, max) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value > 0
      ? Math.min(max, value)
      : fallback;
  };
  const pageSize = positiveInt("size", 10, 100);
  const labelPage = positiveInt("labelPage", 1, 10000);
  const page = positiveInt("page", 1, 10000);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setLabels([]);
    setChanges({});
    Promise.all([
      topicsApi.topics({ component: component || undefined }),
      topicsApi.tests({
        component: component || undefined,
        testId: testId || undefined,
        page,
        work: testId ? "ALL" : work,
        pageSize,
        search: testId ? undefined : search,
      }),
      review && testId
        ? topicsApi.labels({
            testId,
            status,
            reviewFilter,
            page: labelPage,
            pageSize,
            search,
          })
        : Promise.resolve({ items: [], questions: [] }),
    ])
      .then(([catalog, list, detail]) => {
        if (active) {
          setTopics(catalog.items);
          setCoverage(catalog.coverage);
          setTests(list.items);
          setTotalTests(list.totalItems ?? list.items.length);
          setLabels(detail.items);
          setQuestions(detail.questions);
          setTotalLabels(detail.totalItems ?? detail.items.length);
          if (review) {
            const key = testId ? "labelPage" : "page";
            const count = testId ? detail.totalItems : list.totalItems;
            const last = Math.max(1, Math.ceil((count ?? 0) / pageSize));
            if ((testId ? labelPage : page) > last)
              setParams(
                (old) => {
                  const next = new URLSearchParams(old);
                  next.set(key, String(last));
                  return next;
                },
                { replace: true },
              );
          }
        }
      })
      .catch(() => {
        if (active) setError("loadError");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    component,
    testId,
    page,
    review,
    status,
    revision,
    work,
    reviewFilter,
    labelPage,
    pageSize,
    search,
    setParams,
  ]);
  useEffect(() => {
    if (!review) return;
    let active = true,
      fetching = false;
    const poll = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const [summary, list] = await Promise.all([
          topicsApi.progress({ component: component || undefined }),
          topicsApi.tests({
            component: component || undefined,
            testId: testId || undefined,
            page,
            work: testId ? "ALL" : work,
            pageSize,
            search: testId ? undefined : search,
          }),
        ]);
        if (active) {
          setProgress(summary);
          setTests(list.items);
          setTotalTests(list.totalItems ?? list.items.length);
          setProgressError(false);
        }
      } catch {
        if (active) setProgressError(true);
      } finally {
        fetching = false;
      }
    };
    void poll();
    const timer = setInterval(poll, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [review, component, testId, page, work, revision, pageSize, search]);
  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setApprovalResult(null);
    try {
      const result = await action();
      if (
        typeof result?.questions === "number" &&
        typeof result?.reviewed === "number"
      )
        setApprovalResult(result);
      setRevision((v) => v + 1);
      if (typeof result?.queued === "number") {
        setQueuedCount(result.queued);
        setNotice("");
      } else {
        setQueuedCount(null);
        setNotice("saved");
      }
    } catch (e) {
      setError(
        e.response?.status === 429
          ? "cooldown"
          : e.response?.status === 409
            ? "conflict"
            : "saveError",
      );
    } finally {
      setBusy(false);
      setConfirm(null);
      setConfirmTest(null);
      setDeleteTopic(null);
    }
  };
  const previewTestApproval = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const preview = await topicsApi.approvalPreview(testId);
      setConfirmTest({ ...preview, testId });
    } catch {
      setError("loadError");
    } finally {
      setBusy(false);
    }
  };
  const select = (key, value) =>
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page" && key !== "labelPage") next.delete("page");
      if (key !== "labelPage") next.delete("labelPage");
      if (key === "testId") next.delete("q");
      if (key === "component") next.delete("testId");
      return next;
    });
  const selectedTest = tests.find((test) => test.id === testId);
  const hasUnsavedChanges = labels.some(
    (label) => changes[label.id] && changes[label.id] !== label.topic_id,
  );
  const selectedQuestion = questions.find((q) => q.id === manual.questionId);
  const activeTopics = topics.filter(
    (topic) =>
      topic.is_active &&
      (!selectedTest || topic.component === selectedTest.component),
  );
  const item = (label, decision) => ({
    labelId: label.id,
    questionId: label.question_id,
    topicId:
      decision === "REJECTED"
        ? label.topic_id
        : changes[label.id] || label.topic_id,
    questionHash: label.current_hash,
    status: decision,
  });
  const eligible = labels.filter(
    (label) =>
      label.question_hash === label.current_hash &&
      label.status === "SUGGESTED" &&
      activeTopics.some(
        (topic) => topic.id === (changes[label.id] || label.topic_id),
      ),
  );
  const filteredTopics = topics.filter(
    (topic) =>
      (catalogStatus === "ALL" ||
        topic.is_active === (catalogStatus === "active")) &&
      [topic.name, topic.code, topic.description]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const catalogPage = paginate(filteredTopics, page, pageSize);
  const pagination = (current, total, key) => (
    <Pagination
      page={current}
      totalItems={total}
      pageSize={pageSize}
      onPageChange={(value) => select(key, String(value))}
      onPageSizeChange={(value) => select("size", String(value))}
    />
  );
  const detail = topics.find((topic) => topic.id === detailId);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{tr("managementTitle")}</h1>
          <p className={styles.muted}>{tr("managementHelp")}</p>
        </div>
      </header>
      <nav className={styles.tabs} aria-label={tr("managementTitle")}>
        <Link
          className={!review ? styles.tabActive : undefined}
          aria-current={!review ? "page" : undefined}
          to="/admin/learning-topics"
        >
          {tr("title")}
        </Link>
        <Link
          className={review ? styles.tabActive : undefined}
          aria-current={review ? "page" : undefined}
          to="/admin/topic-labels"
        >
          {tr("reviewTitle")}
        </Link>
      </nav>
      <div className={styles.filters}>
        <label className={styles.search}>
          {tr("search")}
          <span>
            <Search size={17} />
            <input
              type="search"
              maxLength={200}
              aria-label={tr("search")}
              placeholder={tr(
                testId
                  ? "searchLabels"
                  : review
                    ? "searchTests"
                    : "searchTopics",
              )}
              value={search}
              onChange={(e) => select("q", e.target.value)}
            />
          </span>
        </label>
        <label>
          {tr("skill")}
          <select
            value={component}
            onChange={(e) => select("component", e.target.value)}
          >
            <option value="">{tr("allSkills")}</option>
            {skills.map((s) => (
              <option key={s} value={s}>
                {t(`personalization.skills.${s}`)}
              </option>
            ))}
          </select>
        </label>
        {!review && (
          <label>
            {tr("status")}
            <select
              value={catalogStatus}
              onChange={(e) => {
                setCatalogStatus(e.target.value);
                select("page", "1");
              }}
            >
              {["ALL", "active", "hidden"].map((value) => (
                <option key={value} value={value}>
                  {tr(value === "ALL" ? "allTopics" : value)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <section className={styles.statistics} aria-label={tr("coverageTitle")}>
        <div className={styles.sectionHeading}>
          <h2>{tr("coverageTitle")}</h2>
          <span className={styles.muted}>{tr("coverageScope")}</span>
        </div>
        <div className={styles.coverage}>
          {skills.map((skill) => {
            const c = coverage.find((row) => row.component === skill) || {
              approved: 0,
              total: 0,
            };
            const percent = c.total
              ? Math.round((c.approved / c.total) * 100)
              : 0;
            const ready = c.total > 0 && c.approved / c.total >= 0.8;
            return (
              <div className={styles.statCard} key={skill}>
                <div className={styles.statLabel}>
                  <span>{t(`personalization.skills.${skill}`)}</span>
                  <CheckCircle2 size={18} aria-hidden="true" />
                </div>
                <strong className={styles.statValue}>
                  {percent}
                  <small>%</small>
                </strong>
                <span className={styles.muted}>
                  {t("topics.coverageCount", c)}
                </span>
                <div className={styles.statTrack} aria-hidden="true">
                  <span style={{ width: percent + "%" }} />
                </div>
                <span className={ready ? styles.ready : styles.muted}>
                  {tr(ready ? "enabled" : "belowThreshold")}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      {review && !testId && (
        <section
          className={`${styles.card} ${styles.batch}`}
          aria-label={tr("batchTitle")}
        >
          <h2>{tr("batchTitle")}</h2>
          <details>
            <summary>{tr("guide")}</summary>
            <p>{tr("batchHelp")}</p>
            <p>{tr("help")}</p>
          </details>
          <Button
            variant="secondary"
            disabled={busy || loading}
            onClick={() =>
              run(() =>
                topicsApi.suggestMissing({ component: component || undefined }),
              )
            }
          >
            {tr("suggestMissing")}
          </Button>
          <p>
            {t("topics.batchScope", {
              skill: component
                ? t(`personalization.skills.${component}`)
                : tr("allSkills"),
            })}
          </p>
          {queuedCount !== null && (
            <p role="status">
              {t("topics.queuedResult", { count: queuedCount })}
            </p>
          )}
          {progressError && <p role="status">{tr("progressError")}</p>}
          {progress && (
            <>
              <p>
                {t("topics.questionProgress", {
                  done: progress.labeled,
                  total: progress.questions,
                })}
              </p>
              <progress
                aria-label={tr("batchTitle")}
                value={progress.labeled}
                max={Math.max(1, progress.questions)}
                style={{ width: "100%" }}
              />
              <p>
                {t("topics.jobProgress", {
                  done: progress.completed,
                  total: progress.tests,
                  queued: progress.queued,
                  retrying: progress.retrying,
                  failed: progress.failed,
                  pending: progress.pending,
                })}
              </p>
              {(!progress.workerEnabled || !progress.aiEnabled) && (
                <p role="status">{tr("workerPaused")}</p>
              )}
            </>
          )}
        </section>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {tr(error)}
        </p>
      )}
      {notice && (
        <p role="status">
          {approvalResult
            ? t("topics.approvedTest", approvalResult)
            : tr(notice)}
        </p>
      )}
      {loading && <p role="status">{tr("loading")}</p>}
      {!review ? (
        <>
          <div className={styles.sectionHeading}>
            <h2>
              {tr("title")}{" "}
              <span className={styles.count}>{filteredTopics.length}</span>
            </h2>
            <Button
              onClick={() => {
                setEditing(null);
                setForm(empty);
                setEditorOpen(true);
              }}
            >
              <Plus size={16} />
              {tr("add")}
            </Button>
          </div>
          {editorOpen && (
            <Modal
              title={tr(editing ? "edit" : "add")}
              onClose={() => {
                if (!busy) setEditorOpen(false);
              }}
            >
              <form
                className={styles.card}
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await topicsApi.save(editing, form);
                    setForm(empty);
                    setEditing(null);
                    setEditorOpen(false);
                  });
                }}
              >
                <div className={styles.grid}>
                  <label>
                    {tr("code")}
                    <input
                      required
                      disabled={!!editing || busy}
                      pattern="[a-z][a-z0-9-]{1,99}"
                      value={form.code}
                      onChange={(e) =>
                        setForm({ ...form, code: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    {tr("name")}
                    <input
                      required
                      maxLength={150}
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    {tr("skill")}
                    <select
                      disabled={!!editing || busy}
                      value={form.component}
                      onChange={(e) =>
                        setForm({ ...form, component: e.target.value })
                      }
                    >
                      {skills.map((s) => (
                        <option key={s} value={s}>
                          {t(`personalization.skills.${s}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {tr("type")}
                    <select
                      value={form.topicType}
                      onChange={(e) =>
                        setForm({ ...form, topicType: e.target.value })
                      }
                    >
                      {["KNOWLEDGE", "STRATEGY", "CRITERION"].map((s) => (
                        <option key={s} value={s}>
                          {tr(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  {tr("description")}
                  <textarea
                    maxLength={1000}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                    />{" "}
                    {tr("active")}
                  </span>
                </label>
                <div className={styles.toolbar}>
                  <Button disabled={busy}>{tr("save")}</Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setForm(empty);
                      setEditorOpen(false);
                    }}
                  >
                    {tr("cancel")}
                  </Button>
                </div>
              </form>
            </Modal>
          )}
          <div className={styles.catalog}>
            {catalogPage.items.map((topic) => (
              <article key={topic.id} className={styles.catalogRow}>
                <div>
                  <h2>{topic.name}</h2>
                  <p>
                    {topic.code} ·{" "}
                    {t(`personalization.skills.${topic.component}`)}
                  </p>
                  <p>{topic.description}</p>
                </div>
                <span className={styles.questionCount}>
                  <BookOpen size={16} aria-hidden="true" />
                  {t("topics.questionCount", {
                    count: topic.question_count ?? 0,
                  })}
                </span>
                <span className={topic.is_active ? styles.badge : styles.muted}>
                  {tr(topic.is_active ? "active" : "hidden")}
                </span>
                <div className={styles.rowActions}>
                  <Button
                    variant="secondary"
                    className={styles.iconButton}
                    aria-label={tr("viewDetail")}
                    title={tr("viewDetail")}
                    onClick={() => setDetailId(topic.id)}
                  >
                    <Eye size={18} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    className={styles.iconButton}
                    aria-label={tr("edit")}
                    title={tr("edit")}
                    onClick={() => {
                      setEditing(topic.id);
                      setForm({
                        code: topic.code,
                        name: topic.name,
                        description: topic.description || "",
                        component: topic.component,
                        topicType: topic.topic_type,
                        isActive: topic.is_active,
                      });
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil size={18} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    className={styles.iconButton}
                    aria-label={tr("delete")}
                    title={tr("delete")}
                    disabled={busy || !topic.is_active}
                    onClick={() => setDeleteTopic(topic)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!filteredTopics.length && !loading && (
            <p className={styles.empty}>{tr("emptyCatalog")}</p>
          )}
          {pagination(catalogPage.page, filteredTopics.length, "page")}
        </>
      ) : (
        <>
          {!testId ? (
            <>
              <label>
                {tr("testFilter")}
                <select
                  aria-label={tr("testFilter")}
                  value={work}
                  onChange={(e) => select("work", e.target.value)}
                >
                  {["ALL", "MISSING", "NEEDS_REVIEW", "FAILED"].map((key) => (
                    <option key={key} value={key}>
                      {tr(`work_${key}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.grid}>
                {tests.map((test) => (
                  <article className={styles.card} key={test.id}>
                    <h2>{test.title}</h2>
                    <p>
                      {test.pending} {tr("pending")}
                    </p>
                    <p>
                      {t("topics.questionProgress", {
                        done: test.labeled ?? 0,
                        total: test.questions ?? 0,
                      })}{" "}
                      · {tr(`job_${test.job_status ?? "NOT_QUEUED"}`)}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => select("testId", test.id)}
                    >
                      {tr("open")}
                    </Button>
                  </article>
                ))}
              </div>
              {!tests.length && !loading && (
                <p className={styles.empty}>{tr("empty")}</p>
              )}
              {pagination(page, totalTests, "page")}
            </>
          ) : (
            <>
              <div className={`${styles.toolbar} ${styles.testActions}`}>
                <Button
                  variant="secondary"
                  onClick={() => select("testId", "")}
                >
                  {tr("back")}
                </Button>
                <h2>{selectedTest?.title}</h2>
                <Button
                  className={styles.primary}
                  disabled={busy || loading || hasUnsavedChanges}
                  onClick={previewTestApproval}
                >
                  {tr("approveTest")}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || loading}
                  onClick={() => run(() => topicsApi.suggest(testId))}
                >
                  {tr("suggest")}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || !eligible.length}
                  onClick={() =>
                    setConfirm(eligible.map((l) => item(l, "APPROVED")))
                  }
                >
                  {tr("approveAll")}
                </Button>
              </div>
              <p className={styles.muted}>{tr("approveTestHelp")}</p>
              {hasUnsavedChanges && (
                <p role="status">{tr("saveChangesFirst")}</p>
              )}
              <p className={styles.muted}>{tr("cooldownHelp")}</p>
              {selectedTest?.error_code && (
                <p role="status">{tr("generationPending")}</p>
              )}
              <div className={styles.filters}>
                <label>
                  {tr("status")}
                  <select
                    aria-label={tr("status")}
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      select("labelPage", "1");
                    }}
                  >
                    {["SUGGESTED", "APPROVED", "REJECTED", "ALL"].map((s) => (
                      <option key={s} value={s}>
                        {tr(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr("reviewFilter")}
                  <select
                    aria-label={tr("reviewFilter")}
                    value={reviewFilter}
                    onChange={(e) => select("reviewFilter", e.target.value)}
                  >
                    {["ALL", "LOW_CONFIDENCE", "STALE", "HIDDEN_TOPIC"].map(
                      (key) => (
                        <option key={key} value={key}>
                          {tr(`review_${key}`)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              {!loading && !labels.length && <p>{tr("empty")}</p>}
              {labels.map((label) => (
                <article className={styles.reviewRow} key={label.id}>
                  <div className={styles.questionBody}>
                    <h2>
                      Part {label.part_number} · {label.question_key}
                    </h2>
                    <pre className={styles.question}>
                      {readable(label.content)}
                    </pre>
                    <details>
                      <summary>{tr("context")}</summary>
                      <pre className={styles.question}>
                        {readable(questionContext(label))}
                      </pre>
                    </details>
                    <p>
                      {tr("answer")}: {readable(answerText(label))}
                    </p>
                  </div>
                  <div className={styles.reviewControls}>
                    <p>
                      {label.topic_name} · {label.source} · {tr(label.status)} ·{" "}
                      {tr("confidence")}:{" "}
                      {label.confidence == null
                        ? "—"
                        : `${Math.round(Number(label.confidence) * 100)}%`}
                    </p>
                    {label.question_hash !== label.current_hash ? (
                      <p role="status">{tr("stale")}</p>
                    ) : (
                      <>
                        <label>
                          {tr("topic")}
                          <select
                            aria-label={tr("topic")}
                            value={changes[label.id] || label.topic_id}
                            onChange={(e) =>
                              setChanges({
                                ...changes,
                                [label.id]: e.target.value,
                              })
                            }
                          >
                            {!activeTopics.some(
                              (t) => t.id === label.topic_id,
                            ) && (
                              <option value={label.topic_id} disabled>
                                {label.topic_name}
                              </option>
                            )}
                            {activeTopics.map((topic) => (
                              <option key={topic.id} value={topic.id}>
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className={styles.toolbar}>
                          <Button
                            variant="secondary"
                            disabled={
                              busy ||
                              !activeTopics.some(
                                (t) =>
                                  t.id ===
                                  (changes[label.id] || label.topic_id),
                              )
                            }
                            onClick={() =>
                              run(() =>
                                topicsApi.review([item(label, "APPROVED")]),
                              )
                            }
                          >
                            {tr("approve")}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                topicsApi.review([item(label, "REJECTED")]),
                              )
                            }
                          >
                            {tr("reject")}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              ))}
              {pagination(labelPage, totalLabels, "labelPage")}
              <details className={styles.manual}>
                <summary>{tr("manual")}</summary>
                <form
                  className={styles.card}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = questions.find((q) => q.id === manual.questionId);
                    if (q)
                      void run(() =>
                        topicsApi.review([
                          {
                            questionId: q.id,
                            topicId: manual.topicId,
                            questionHash: q.question_hash,
                            status: "APPROVED",
                          },
                        ]),
                      );
                  }}
                >
                  <h2>{tr("manual")}</h2>
                  <label>
                    {tr("question")}
                    <select
                      required
                      value={manual.questionId}
                      onChange={(e) =>
                        setManual({ ...manual, questionId: e.target.value })
                      }
                    >
                      <option value="">—</option>
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.question_key} · {questionText(q).slice(0, 100)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedQuestion && (
                    <>
                      <pre className={styles.question}>
                        {readable(selectedQuestion.content)}
                      </pre>
                      <p>
                        {tr("answer")}: {readable(answerText(selectedQuestion))}
                      </p>
                      <details>
                        <summary>{tr("context")}</summary>
                        <pre className={styles.question}>
                          {readable(questionContext(selectedQuestion))}
                        </pre>
                      </details>
                    </>
                  )}
                  <label>
                    {tr("topic")}
                    <select
                      aria-label={tr("topic")}
                      required
                      value={manual.topicId}
                      onChange={(e) =>
                        setManual({ ...manual, topicId: e.target.value })
                      }
                    >
                      <option value="">—</option>
                      {activeTopics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button variant="secondary" disabled={busy}>
                    {tr("approve")}
                  </Button>
                </form>
              </details>
            </>
          )}
        </>
      )}
      {detail && (
        <Modal title={tr("viewDetail")} onClose={() => setDetailId(null)}>
          <div className={styles.topicDetail}>
            <h2>{detail.name}</h2>
            <span className={styles.badge}>
              {tr(detail.is_active ? "active" : "hidden")}
            </span>
            <dl>
              <div>
                <dt>{tr("code")}</dt>
                <dd>{detail.code}</dd>
              </div>
              <div>
                <dt>{tr("skill")}</dt>
                <dd>{t(`personalization.skills.${detail.component}`)}</dd>
              </div>
              <div>
                <dt>{tr("type")}</dt>
                <dd>{tr(detail.topic_type)}</dd>
              </div>
            </dl>
            <p className={styles.description}>
              {detail.description || tr("noDescription")}
            </p>
            <div className={styles.detailStats}>
              {[
                ["linkedQuestions", "question_count"],
                ["approvedQuestions", "approved_count"],
                ["pendingQuestions", "pending_count"],
                ["linkedTests", "test_count"],
              ].map(([key, field]) => (
                <div key={key}>
                  <strong>{detail[field] ?? 0}</strong>
                  <span>{tr(key)}</span>
                </div>
              ))}
            </div>
            <p className={styles.muted}>{tr("countHelp")}</p>
          </div>
        </Modal>
      )}
      {deleteTopic && (
        <ConfirmModal
          title={tr("delete")}
          message={t("topics.confirmDelete", { name: deleteTopic.name })}
          busy={busy}
          confirmText={tr("delete")}
          cancelText={tr("cancel")}
          onCancel={() => setDeleteTopic(null)}
          onConfirm={() => run(() => topicsApi.remove(deleteTopic.id))}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={tr("approveAll")}
          message={t("topics.confirmAll", { count: confirm.length })}
          busy={busy}
          confirmText={tr("approve")}
          cancelText={tr("cancel")}
          onConfirm={() => run(() => topicsApi.review(confirm))}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirmTest && (
        <ConfirmModal
          title={tr("approveTest")}
          message={t("topics.confirmTest", confirmTest)}
          busy={busy}
          confirmText={tr("approve")}
          cancelText={tr("cancel")}
          onConfirm={() =>
            run(() =>
              topicsApi.approveTest(confirmTest.testId, confirmTest.revision),
            )
          }
          onCancel={() => setConfirmTest(null)}
        />
      )}
    </div>
  );
}
