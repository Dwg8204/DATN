import { useEffect, useRef, useState } from 'react';
import { Check, Clipboard, History, MessageCircle, Plus, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { createSession, loadChatSessions, makeMockReply, saveChatSessions } from '../services/mockChatRepository';
import styles from './ChatAssistantWidget.module.css';

const MAX_MESSAGE_LENGTH = 4000;
const SUGGESTIONS = [
  'Explain a grammar point',
  'Help me improve my writing',
  'Practise vocabulary',
];

function makeTitle(value) {
  const title = value.replace(/\s+/g, ' ').trim();
  return title.length > 42 ? `${title.slice(0, 42)}…` : title;
}

function Message({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : ''}`}>
      {!isUser && <span className={styles.avatar}><Sparkles size={14} /></span>}
      <div className={styles.messageBody}>
        <div className={`${styles.message} ${isUser ? styles.userMessage : styles.assistantMessage}`}>
          {message.content}
        </div>
        {!isUser && (
          <button type="button" className={styles.copyButton} onClick={copyMessage}>
            {copied ? <Check size={13} /> : <Clipboard size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatAssistantWidget() {
  const { user } = useAuth();
  const userKey = user?.id || user?.email || 'guest';
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState(() => loadChatSessions(userKey));
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const replyTimerRef = useRef(null);

  useEffect(() => {
    const stored = loadChatSessions(userKey);
    setSessions(stored);
    setActiveId(stored[0]?.id || null);
  }, [userKey]);

  useEffect(() => {
    saveChatSessions(userKey, sessions);
  }, [sessions, userKey]);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ block: 'end' });
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, sessions, isThinking]);

  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      window.clearTimeout(replyTimerRef.current);
    };
  }, []);

  const activeSession = sessions.find(session => session.id === activeId) || null;
  const messages = activeSession?.messages || [];

  const startNewChat = () => {
    if (isThinking) return;
    const session = createSession();
    setSessions(current => [session, ...current]);
    setActiveId(session.id);
    setDraft('');
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const openSession = sessionId => {
    setActiveId(sessionId);
    setShowHistory(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const deleteSession = (event, sessionId) => {
    event.stopPropagation();
    if (isThinking && sessionId === activeId) return;
    setSessions(current => {
      const remaining = current.filter(session => session.id !== sessionId);
      if (sessionId === activeId) setActiveId(remaining[0]?.id || null);
      return remaining;
    });
  };

  const sendMessage = event => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || isThinking) return;

    const userMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toISOString() };
    let sessionId = activeId;

    if (!sessionId) {
      const session = { ...createSession(), title: makeTitle(content), messages: [userMessage] };
      sessionId = session.id;
      setActiveId(sessionId);
      setSessions(current => [session, ...current]);
    } else {
      setSessions(current => current.map(session => session.id === sessionId
        ? {
            ...session,
            title: session.messages.length ? session.title : makeTitle(content),
            messages: [...session.messages, userMessage],
            updatedAt: userMessage.createdAt,
          }
        : session));
    }

    setDraft('');
    setIsThinking(true);
    replyTimerRef.current = window.setTimeout(() => {
      const reply = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: makeMockReply(content),
        createdAt: new Date().toISOString(),
      };
      setSessions(current => current.map(session => session.id === sessionId
        ? { ...session, messages: [...session.messages, reply], updatedAt: reply.createdAt }
        : session));
      setIsThinking(false);
    }, 700);
  };

  const handleKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.widget}>
      {isOpen && (
        <section className={styles.panel} aria-label="AptiMate AI Assistant">
          <header className={styles.header}>
            <span className={styles.headerIcon}><Sparkles size={19} /></span>
            <div>
              <strong>AptiMate Assistant</strong>
              <small><i /> Online · AI learning support</small>
            </div>
            <button
              type="button"
              onClick={() => setShowHistory(current => !current)}
              title="Chat history"
              aria-label="Open chat history"
              aria-pressed={showHistory}
            >
              <History size={19} />
            </button>
            <button type="button" onClick={startNewChat} disabled={isThinking} title="New chat" aria-label="Start a new chat">
              <Plus size={20} />
            </button>
            <button type="button" onClick={() => setIsOpen(false)} title="Close" aria-label="Close assistant">
              <X size={21} />
            </button>
          </header>

          {showHistory ? (
            <div className={styles.historyPanel}>
              <div className={styles.historyHeading}>
                <div><strong>Chat history</strong><small>{sessions.length} conversation{sessions.length === 1 ? '' : 's'}</small></div>
                <button type="button" onClick={startNewChat}><Plus size={16} /> New chat</button>
              </div>
              <div className={styles.historyList}>
                {sessions.length ? sessions.map(session => (
                  <div
                    key={session.id}
                    className={`${styles.historyItem} ${session.id === activeId ? styles.activeHistoryItem : ''}`}
                  >
                    <button type="button" className={styles.historyOpen} onClick={() => openSession(session.id)}>
                      <MessageCircle size={17} />
                      <span>
                        <strong>{session.title}</strong>
                        <small>{new Date(session.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.deleteHistory}
                      aria-label={`Delete ${session.title}`}
                      onClick={event => deleteSession(event, session.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )) : (
                  <div className={styles.emptyHistory}><History size={28} /><strong>No chat history yet</strong><span>Start a conversation and it will appear here.</span></div>
                )}
              </div>
            </div>
          ) : <div className={styles.messages} aria-live="polite">
            {!messages.length && (
              <div className={styles.welcome}>
                <span><Sparkles size={22} /></span>
                <h2>How can I help you?</h2>
                <p>Ask me about Aptis skills, test feedback, or your study plan.</p>
                <div className={styles.suggestions}>
                  {SUGGESTIONS.map(suggestion => (
                    <button type="button" key={suggestion} onClick={() => { setDraft(suggestion); inputRef.current?.focus(); }}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(message => <Message key={message.id} message={message} />)}
            {isThinking && (
              <div className={styles.messageRow}>
                <span className={styles.avatar}><Sparkles size={14} /></span>
                <div className={styles.typing}><i /><i /><i /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>}

          {!showHistory && <form className={styles.composer} onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              rows="1"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AptiMate Assistant..."
              aria-label="Chat message"
            />
            <button type="submit" disabled={!draft.trim() || isThinking} aria-label="Send message">
              <Send size={18} />
            </button>
          </form>}
          {!showHistory && <small className={styles.disclaimer}>AI may make mistakes. Check important information.</small>}
        </section>
      )}

      <button
        type="button"
        className={`${styles.launcher} ${isOpen ? styles.launcherOpen : ''}`}
        onClick={() => setIsOpen(current => !current)}
        aria-label={isOpen ? 'Close AptiMate Assistant' : 'Open AptiMate Assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={25} /> : <MessageCircle size={27} />}
        {!isOpen && <span className={styles.launcherLabel}>Ask AptiMate</span>}
      </button>
    </div>
  );
}
