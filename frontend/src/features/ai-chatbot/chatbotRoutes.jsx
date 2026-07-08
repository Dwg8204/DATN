import { useState } from 'react';
import Button from '../../components/common/Button';
import CustomInput from '../../components/common/CustomInput';

function ChatBubble({ role, text }) {
  return <div className={`chat-bubble chat-bubble--${role}`}>{text}</div>;
}

function AIChatbotPage() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([
    { role: 'assistant', text: 'Xin chào, tôi là trợ lý ảo AptiMate.' },
    { role: 'user', text: 'Tôi muốn ôn thi writing.' },
    { role: 'assistant', text: 'Hãy bắt đầu bằng việc luyện cấu trúc câu và từ vựng theo chủ đề.' },
  ]);

  const handleSend = (event) => {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    setHistory((current) => [...current, { role: 'user', text: message.trim() }]);
    setMessage('');
  };

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-hero surface">
          <h1 className="section-title">AI Chatbot</h1>
          <p className="section-description">Module hội thoại độc lập để tích hợp trợ lý học tập.</p>
        </div>

        <div className="surface chatbot-panel">
          <div className="chat-history">
            {history.map((item, index) => (
              <ChatBubble key={`${item.role}-${index}`} {...item} />
            ))}
          </div>

          <form className="chat-form" onSubmit={handleSend}>
            <CustomInput
              label="Nhập câu hỏi"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Hỏi về ngữ pháp, từ vựng, chiến lược làm bài..."
            />
            <Button type="submit">Gửi</Button>
          </form>
        </div>
      </div>
    </section>
  );
}

export const chatbotRoutes = [
  {
    path: 'ai-chatbot',
    element: <AIChatbotPage />,
  },
];