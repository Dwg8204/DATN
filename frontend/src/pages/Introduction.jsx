import { useUiTranslation } from "../i18n/useUiTranslation.jsx";
export default function Introduction() {
  const ui = useUiTranslation();
  return (
    <section className="page-section">
      <div className="container">
        <div className="surface intro-card">
          <h1 className="section-title">{ui("Introduction to the Aptis test")}</h1>
          <p className="section-description">{ui("Learn about the test process, exam structure, and study flow before starting each skill module.")}</p>
        </div>
      </div>
    </section>
  );
}
