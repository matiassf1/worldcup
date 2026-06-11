import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../socket.js';

export default function AdminControls() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState('');
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('stream:state', ({ isStreaming: s, viewerCount: v }) => {
      setIsStreaming(s);
      setViewerCount(v);
    });

    socket.on('viewer:count', (count) => setViewerCount(count));

    return () => {
      socket.off('stream:state');
      socket.off('viewer:count');
    };
  }, []);

  async function startStream() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      streamRef.current = stream;

      const mimeType = 'video/webm; codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        setError('Tu navegador no soporta video/webm con vp8. Usá Chrome o Edge.');
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      const socket = getSocket();
      // Send the actual mimeType MediaRecorder chose (may include opus for audio)
      socket.emit('stream:start', { mimeType: mr.mimeType });
      setIsStreaming(true);

      mr.ondataavailable = async (e) => {
        if (e.data.size > 0 && socket.connected) {
          const buffer = await e.data.arrayBuffer();
          socket.emit('stream:chunk', buffer);
        }
      };

      mr.onstop = () => {
        // Only stop if we didn't already stop manually
      };

      // If user closes the OS screen picker or stops sharing via browser UI
      stream.getVideoTracks()[0].addEventListener('ended', stopStream);

      mr.start(100);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError('No se pudo iniciar la captura de pantalla.');
      }
    }
  }

  function stopStream() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const socket = getSocket();
    if (socket) socket.emit('stream:stop');
    setIsStreaming(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.statusRow}>
        <div style={styles.statusIndicator}>
          <span
            style={{
              ...styles.dot,
              background: isStreaming ? 'var(--accent)' : '#555',
              boxShadow: isStreaming ? '0 0 8px var(--accent)' : 'none',
            }}
          />
          <span style={styles.statusText}>
            {isStreaming ? 'EN VIVO' : 'OFFLINE'}
          </span>
        </div>
        <div style={styles.viewerPill}>
          <span>👁</span>
          <span style={styles.viewerNum}>{viewerCount}</span>
          <span style={styles.viewerLabel}>viewers</span>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.controls}>
        {!isStreaming ? (
          <button style={styles.startBtn} onClick={startStream}>
            ▶ Iniciar transmisión
          </button>
        ) : (
          <button style={styles.stopBtn} onClick={stopStream}>
            ⏹ Detener transmisión
          </button>
        )}
      </div>

      <div style={styles.hints}>
        <p style={styles.hint}>• Podés compartir una pestaña, una ventana o toda la pantalla.</p>
        <p style={styles.hint}>• El stream llega a los viewers con ~2-5 segundos de delay.</p>
        <p style={styles.hint}>• Si cerrás este panel, el stream se detiene automáticamente.</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '2rem',
    gap: '1.5rem',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'all 0.3s',
  },
  statusText: {
    fontWeight: 700,
    fontSize: '0.875rem',
    letterSpacing: '1px',
    color: 'var(--text)',
  },
  viewerPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '0.35rem 0.9rem',
  },
  viewerNum: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: 'var(--text)',
  },
  viewerLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
  error: {
    color: 'var(--accent)',
    background: 'rgba(229,9,20,0.1)',
    border: '1px solid rgba(229,9,20,0.3)',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
  },
  controls: {
    display: 'flex',
    gap: '1rem',
  },
  startBtn: {
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '0.5px',
    transition: 'background 0.2s',
  },
  stopBtn: {
    background: '#333',
    color: 'var(--text)',
    borderRadius: 'var(--radius)',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    border: '1px solid var(--border)',
  },
  hints: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: 'auto',
  },
  hint: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
};
