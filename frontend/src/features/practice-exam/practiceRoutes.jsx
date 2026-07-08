import PracticeExamCard from './components/PracticeExamCard';
import usePracticeExams from './hooks/usePracticeExams';

function PracticeExamPage() {
  const { exams } = usePracticeExams();

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-hero surface">
          <h1 className="section-title">Practice Exam</h1>
          <p className="section-description">Danh sách đề luyện đọc/nghe được tách riêng theo module.</p>
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