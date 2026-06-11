import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket, getSocket } from '../socket.js';
import StreamPlayer from '../components/StreamPlayer.jsx';
import ChatPanel from '../components/ChatPanel.jsx';

export default function ViewerRoom() {
  const navigate = useNavigate();
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('viewerToken');
    if (!token) {
      navigate('/');
      return;
    }

    const socket = connectSocket(token, 'viewer');

    socket.on('connect_error', () => {
      localStorage.removeItem('viewerToken');
      navigate('/');
    });

    socket.on('stream:start', () => setIsStreaming(true));
    socket.on('stream:stop', () => setIsStreaming(false));

    socket.on('chat:message', (msg) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    });

    socket.on('viewer:count', (count) => setViewerCount(count));

    return () => disconnectSocket();
  }, [navigate]);

  return (
    <div style={styles.layout}>
      <div style={styles.playerSection}>
        <div style={styles.header}>
          <span style={styles.logo}>Mundial Stream</span>
          {isStreaming && (
            <span style={styles.liveBadge}>● EN VIVO</span>
          )}
          <span style={styles.viewerCount}>👁 {viewerCount}</span>
        </div>
        <StreamPlayer isStreaming={isStreaming} />
      </div>
      <div style={styles.chatSection}>
        <ChatPanel messages={messages} />
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    height: '100vh',
    background: 'var(--bg)',
    overflow: 'hidden',
  },
  playerSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1.25rem',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: 'var(--accent)',
    flex: 1,
  },
  liveBadge: {
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.25rem 0.6rem',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  viewerCount: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
  chatSection: {
    width: '280px',
    borderLeft: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
  },
};
