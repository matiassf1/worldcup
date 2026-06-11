import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PublicLoginPage() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/room/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password }),
      });
      if (!res.ok) {
        setError('Credenciales incorrectas');
        return;
      }
      const { token } = await res.json();
      localStorage.setItem('viewerToken', token);
      navigate('/room');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Mundial Stream</h1>
        <p style={styles.subtitle}>Ingresá para ver la transmisión</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Usuario"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
            autoComplete="username"
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '1rem',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  title: {
    color: 'var(--accent)',
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    outline: 'none',
  },
  error: {
    color: 'var(--accent)',
    fontSize: '0.875rem',
  },
  button: {
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '0.5rem',
    transition: 'background 0.2s',
  },
};
