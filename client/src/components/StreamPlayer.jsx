import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../socket.js';

const DEFAULT_MIME = 'video/webm; codecs="vp8,opus"';

export default function StreamPlayer({ isStreaming }) {
  const videoRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const chunkQueueRef = useRef([]);
  const isInitializedRef = useRef(false);
  const mimeTypeRef = useRef(DEFAULT_MIME);
  const [muted, setMuted] = useState(true);

  function flushQueue() {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating || chunkQueueRef.current.length === 0) return;
    const next = chunkQueueRef.current.shift();
    try {
      sb.appendBuffer(next);
    } catch {
      // SourceBuffer may be in an invalid state if stream stopped
    }
  }

  function appendChunk(chunk) {
    let buffer;
    if (chunk instanceof ArrayBuffer) {
      buffer = chunk;
    } else if (chunk instanceof Uint8Array) {
      buffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
    } else if (typeof chunk === 'object' && chunk !== null) {
      // Socket.io may deliver as plain object with numeric keys
      buffer = new Uint8Array(Object.values(chunk)).buffer;
    } else {
      return;
    }
    chunkQueueRef.current.push(buffer);
    flushQueue();
  }

  function initMSE() {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    videoRef.current.src = URL.createObjectURL(ms);

    ms.addEventListener('sourceopen', () => {
      const mime = mimeTypeRef.current;
      if (!MediaSource.isTypeSupported(mime)) {
        console.error('MSE does not support codec:', mime);
        return;
      }
      const sb = ms.addSourceBuffer(mime);
      sourceBufferRef.current = sb;
      sb.addEventListener('updateend', () => {
        // Resume playback if it stalled waiting for data
        if (videoRef.current?.paused && videoRef.current?.readyState >= 2) {
          videoRef.current.play().catch(() => {});
        }
        flushQueue();
      });
      sb.addEventListener('error', (e) => console.error('SourceBuffer error:', e));
      flushQueue();
    });
  }

  function cleanupMSE() {
    sourceBufferRef.current = null;
    chunkQueueRef.current = [];
    isInitializedRef.current = false;
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
      try { mediaSourceRef.current.endOfStream(); } catch { /* ignore */ }
    }
    mediaSourceRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onStreamStart({ mimeType } = {}) {
      mimeTypeRef.current = mimeType || DEFAULT_MIME;
      cleanupMSE();
      initMSE();
      videoRef.current?.play().catch(() => {});
    }

    function onStreamChunk(chunk) {
      if (!isInitializedRef.current) initMSE();
      appendChunk(chunk);
    }

    function onStreamStop() {
      cleanupMSE();
    }

    socket.on('stream:start', onStreamStart);
    socket.on('stream:chunk', onStreamChunk);
    socket.on('stream:stop', onStreamStop);

    return () => {
      socket.off('stream:start', onStreamStart);
      socket.off('stream:chunk', onStreamChunk);
      socket.off('stream:stop', onStreamStop);
    };
  }, []);

  return (
    <div style={styles.container}>
      <video
        ref={videoRef}
        style={styles.video}
        autoPlay
        playsInline
        muted={muted}
      />
      {isStreaming && (
        <button
          style={styles.muteBtn}
          onClick={() => setMuted((m) => !m)}
          title={muted ? 'Activar audio' : 'Silenciar'}
        >
          {muted ? '🔇 Activar audio' : '🔊 Silenciar'}
        </button>
      )}
      {!isStreaming && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <span style={styles.offlineIcon}>📡</span>
            <p style={styles.offlineText}>Sin transmisión activa</p>
            <p style={styles.offlineSubtext}>Esperando que el admin inicie el stream...</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    position: 'relative',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  muteBtn: {
    position: 'absolute',
    bottom: '1rem',
    right: '1rem',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    zIndex: 10,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
  },
  overlayContent: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  offlineIcon: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  offlineText: {
    color: 'var(--text)',
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  offlineSubtext: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
};
