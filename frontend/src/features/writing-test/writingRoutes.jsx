import { useState } from 'react';
import Button from '../../components/common/Button';
import CustomInput from '../../components/common/CustomInput';
import { countWords } from './utils/wordCount';

function WritingTestPage() {
  const [title, setTitle] = useState('');
  const [answer, setAnswer] = useState('');

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-hero surface">
          <h1 className="section-title">Writing Test</h1>
          <p className="section-description">The writing editor and word counter are provided by the Writing module.</p>
        </div>

        <div className="surface writing-panel">
          <CustomInput label="Essay title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="form-field">
            <span className="form-field__label">Bài làm</span>
            <textarea
              className="form-field__textarea"
              rows="10"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Enter your answer..."
            />
          </label>
          <div className="writing-panel__meta">
            <span>Word count: {countWords(answer)}</span>
            <Button type="button">Nộp bài</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export const writingRoutes = [
  {
    path: 'writing-test',
    element: <WritingTestPage />,
  },
];
