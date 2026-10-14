import { useUiTranslation } from "../../i18n/useUiTranslation.jsx";
import PracticeExamCard from './components/PracticeExamCard';
import usePracticeExams from './hooks/usePracticeExams';

function PracticeExamPage() {
  const ui = useUiTranslation();
  const { exams } = usePracticeExams();

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-hero surface">
          <h1 className="section-title">{ui("Practice Exam")}</h1>
          <p className="section-description">{ui("Reading and listening practice tests are organised by module.")}</p>
        </div>

        <div className="feature-grid">
          {exams.map((exam) => (
            <PracticeExamCard key={exam.id} {...exam} />
          ))}
        </div>
      </div>
    </section>
  );
}

export const practiceRoutes = [
  {
    path: 'practice-exam',
    element: <PracticeExamPage />,
  },
];
