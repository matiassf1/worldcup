import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../socket.js';

export default function ChatPanel({ messages }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (socket) socket.emit('chat:message', { text: trimmed });
    setText('');
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Chat</span>
      </div>
      <div style={styles.messages}>
        {messages.length === 0 && (
          <p style={styles.empty}>Todavía no hay mensajes. ¡Sé el primero!</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={styles.message}>
            <span style={styles.nickname}>{msg.nickname}</span>
            <span style={styles.time}>{formatTime(msg.ts)}</span>
            <p style={styles.text}>{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Escribí algo..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
        />
        <button style={styles.sendBtn} type="submit" aria-label="Enviar">
          ➤
        </button>
      </form>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--surface)',
  },
  header: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--text)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  empty: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    textAlign: 'center',
    marginTop: '2rem',
    padding: '0 1rem',
  },
  message: {
    background: 'var(--surface2)',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '0.25rem 0.5rem',
  },
  nickname: {
    color: 'var(--accent)',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  time: {
    color: 'var(--text-muted)',
    fontSize: '0.7rem',
  },
  text: {
    color: 'var(--text)',
    fontSize: '0.875rem',
    width: '100%',
    wordBreak: 'break-word',
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem',
    borderTop: '1px solid var(--border)',
  },
  input: {
    flex: 1,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    minWidth: 0,
  },
  sendBtn: {
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    flexShrink: 0,
  },
};
