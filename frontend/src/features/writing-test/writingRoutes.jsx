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
          <p className="section-description">Khung nhập bài viết và đếm từ được đóng gói riêng cho module Writing.</p>
        </div>

        <div className="surface writing-panel">
          <CustomInput label="Tiêu đề bài viết" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="form-field">
            <span className="form-field__label">Bài làm</span>
            <textarea
              className="form-field__textarea"
              rows="10"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Nhập bài làm của bạn..."
            />
          </label>
          <div className="writing-panel__meta">
            <span>Số từ: {countWords(answer)}</span>
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