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
    { role: 'assistant', text: 'Start by practising sentence structures and topic-based vocabulary.' },
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
          <p className="section-description">A dedicated conversation module for the learning assistant.</p>
        </div>

        <div className="surface chatbot-panel">
          <div className="chat-history">
            {history.map((item, index) => (
              <ChatBubble key={`${item.role}-${index}`} {...item} />
            ))}
          </div>

          <form className="chat-form" onSubmit={handleSend}>
            <CustomInput
              label="Your question"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about grammar, vocabulary, or test strategies..."
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
