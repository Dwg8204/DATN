import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import ConfirmModal from "../../../components/common/ConfirmModal";
import Pagination from "../../../components/common/Pagination";
import PageLoader from "../../../components/common/PageLoader";
import { ragApi } from "./ragApi";
import styles from "./RagPage.module.css";
const skills = ["GRAMMAR_VOCAB", "READING", "LISTENING", "WRITING", "SPEAKING"];
const paths = {
  GRAMMAR_VOCAB: "grammar",
  READING: "reading",
  LISTENING: "listening",
  WRITING: "writing",
  SPEAKING: "speaking",
};
export default function RagPage() {
  const { t } = useTranslation(),
    tr = (key, values) => t("ragAdmin." + key, values);
  const [tab, setTab] = useState("coverage"),
    [status, setStatus] = useState(null),
    [error, setError] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [filters, setFilters] = useState({
      component: "",
      feature: "",
      from: "",
      to: "",
      page: 1,
      pageSize: 10,
    }),
    [gaps, setGaps] = useState(null),
    [gapError, setGapError] = useState(false),
    [loading, setLoading] = useState(false);
  const [component, setComponent] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [queued, setQueued] = useState(null),
    [actionError, setActionError] = useState(false);
  useEffect(() => {
    let active = true,
      running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const value = await ragApi.status();
        if (active) {
          setStatus(value);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        running = false;
      }
    };
    void load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (tab !== "gaps") return;
    let active = true;
    setLoading(true);
    setGapError(false);
    ragApi
      .gaps(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")),
      )
      .then((value) => {
        if (active) setGaps(value);
      })
      .catch(() => {
        if (active) {
          setGapError(true);
          setGaps(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, filters, refresh]);
  const change = (key, value) =>
    setFilters((old) => ({ ...old, [key]: value, page: 1 }));
  const enqueue = async () => {
    setBusy(true);
    setActionError(false);
    try {
      const result = await ragApi.reembed(component);
      setQueued(result.queued);
      setConfirm(false);
      setRefresh((r) => r + 1);
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };
  const skillOptions = (
    <>
      <option value="">{tr("all")}</option>
      {skills.map((s) => (
        <option key={s} value={s}>
          {t("personalization.ability.skills." + s)}
        </option>
      ))}
    </>
  );
  if (!status && !error) return <PageLoader />;
  return (
    <section className={styles.page}>
      <header className={styles.header}><h1>{tr("title")}</h1>
      <Button onClick={() => setRefresh((r) => r + 1)}>{tr("reload")}</Button></header>
      <div className={styles.tabs}>
        {["coverage", "gaps", "actions"].map((key) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "secondary"}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {tr(key)}
          </Button>
        ))}
      </div>
      {error && <p role="alert">{tr("error")} </p>}
      {status && !status.enabled && <p role="status">{tr("disabled")}</p>}
      {tab === "coverage" && status && (
        <>
          <div className={styles.cards}>
            {(status.coverage ?? []).map((row) => (
              <section key={row.component} className={styles.card}>
                <h3>{t("personalization.ability.skills." + row.component)}</h3>
                <strong>
                  {row.embedded}/{row.total}
                </strong>
                {row.percent != null && <progress aria-label={t("personalization.ability.skills." + row.component)} value={row.percent} max={100} />}
                <p>
                  {row.percent == null ? tr("noQuestions") : row.percent + "%"}
                </p>
              </section>
            ))}
          </div>
          <div className={styles.missing}><section><h3>{tr("missingTopics")}</h3>
          <ul>
            {(status.missingTopics ?? []).map((row) => (
              <li key={row.code}>
                {row.name} · <code>{row.code}</code>
              </li>
            ))}
          </ul>
          {!status.missingTopics?.length && <p>{tr("none")}</p>}
          </section><section><h3>{tr("missingCriteria")}</h3>
          <ul>
            {(status.missingCriteria ?? []).map((row) => (
              <li key={row.component + row.criterion}>
                {t("personalization.ability.skills." + row.component)} ·{" "}
                {tr("criteria." + row.criterion)}
              </li>
            ))}
          </ul>
          {!status.missingCriteria?.length && <p>{tr("none")}</p>}</section></div>
        </>
      )}
      {tab === "gaps" && (
        <>
          <div className={styles.filters}>
            <label>
              {tr("skill")}
              <select
                aria-label={tr("skill")}
                value={filters.component}
                onChange={(e) => change("component", e.target.value)}
              >
                {skillOptions}
              </select>
            </label>
            <label>
              {tr("feature")}
              <select
                aria-label={tr("feature")}
                value={filters.feature}
                onChange={(e) => change("feature", e.target.value)}
              >
                <option value="">{tr("all")}</option>
                {["PLAN", "EXPLAIN", "REPORT"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            {["from", "to"].map((key) => (
              <label key={key}>
                {tr(key)}
                <input
                  type="date"
                  value={filters[key]}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <p>{tr("utc")}</p>
          {loading ? (
            <PageLoader />
          ) : gapError ? (
            <p role="alert">{tr("error")}</p>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {[
                        "group",
                        "events",
                        "learners",
                        "similarity",
                        "samples",
                      ].map((key) => (
                        <th key={key} scope="col">
                          {tr(key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(gaps?.data ?? []).map((row, i) => (
                      <tr key={i}>
                        <td data-label={tr("group")}>
                          {t("personalization.ability.skills." + row.component)}{" "}
                          ·{" "}
                          {row.part_number
                            ? tr("part", { n: row.part_number })
                            : t("dashboard.noData")}{" "}
                          · {row.topic ?? tr("unknownTopic")}
                        </td>
                        <td data-label={tr("events")}>{row.occurrences}</td>
                        <td data-label={tr("learners")}>{row.learners}</td>
                        <td data-label={tr("similarity")}>
                          {row.average_similarity == null
                            ? t("dashboard.noData")
                            : Number(row.average_similarity).toFixed(3)}
                        </td>
                        <td data-label={tr("samples")}>
                          <ul>
                            {row.samples.map((sample) => (
                              <li key={sample.questionId}>
                                <Link
                                  to={`/admin/tests/${paths[row.component]}/${sample.testId}/edit${sample.partNumber ? "/part/" + sample.partNumber : ""}`}
                                >
                                  {sample.title} · {sample.excerpt}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!gaps?.data?.length && <p>{tr("none")}</p>}
              <Pagination
                page={filters.page}
                pageSize={filters.pageSize}
                totalItems={gaps?.pagination?.totalItems ?? 0}
                onPageChange={(page) => setFilters((old) => ({ ...old, page }))}
                onPageSizeChange={(size) => change("pageSize", size)}
              />
            </>
          )}
        </>
      )}
      {tab === "actions" && status && (
        <>
          <p>{tr("reembedHelp")}</p>
          <label>
            {tr("skill")}{" "}
            <select
              aria-label={tr("skill")}
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              disabled={busy}
            >
              {skillOptions}
            </select>
          </label>
          <Button
            onClick={() => {
              setActionError(false);
              setConfirm(true);
            }}
            disabled={busy || !status.enabled}
          >
            {tr("reembed")}
          </Button>
          {queued !== null && (
            <p role="status">{tr("queued", { count: queued })}</p>
          )}
          {actionError && <p role="alert">{tr("error")}</p>}
          <div className={styles.cards}>
            {(status.jobs ?? []).map((job) => (
              <section key={job.component} className={styles.card}>
                <h3>{t("personalization.ability.skills." + job.component)}</h3>
                <p>
                  {tr("jobs", {
                    completed: job.completed,
                    pending: job.pending,
                    failed: job.failed,
                  })}
                </p>
              </section>
            ))}
          </div>
          <p>{tr("poll")}</p>
        </>
      )}
      {confirm && (
        <ConfirmModal
          title={tr("reembed")}
          message={
            (actionError ? tr("error") + " " : "") +
            tr("confirm", {
              scope: component
                ? t("personalization.ability.skills." + component)
                : tr("all"),
            })
          }
          onConfirm={enqueue}
          onCancel={() => setConfirm(false)}
          busy={busy}
          confirmText={tr("confirmButton")}
          cancelText={tr("cancel")}
        />
      )}
    </section>
  );
}
