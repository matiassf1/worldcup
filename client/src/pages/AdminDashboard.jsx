import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket } from '../socket.js';
import AdminControls from '../components/AdminControls.jsx';
import ChatPanel from '../components/ChatPanel.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    const socket = connectSocket(token, 'admin');

    socket.on('connect_error', () => {
      localStorage.removeItem('adminToken');
      navigate('/admin');
    });

    socket.on('connect', () => setSocketReady(true));

    socket.on('chat:message', (msg) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    });

    return () => disconnectSocket();
  }, [navigate]);

  if (!socketReady) {
    return (
      <div style={styles.loading}>
        <p>Conectando...</p>
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      <div style={styles.mainSection}>
        <div style={styles.header}>
          <span style={styles.logo}>Mundial Admin</span>
          <button
            style={styles.logoutBtn}
            onClick={() => {
              localStorage.removeItem('adminToken');
              navigate('/admin');
            }}
          >
            Salir
          </button>
        </div>
        <AdminControls />
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
  mainSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
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
  logoutBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    border: '1px solid var(--border)',
  },
  chatSection: {
    width: '280px',
    borderLeft: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--bg)',
    color: 'var(--text-muted)',
  },
};
