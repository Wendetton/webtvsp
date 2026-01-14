// components/VideoManager.js - Gerenciador de vídeos por URL
import { useEffect, useState, useRef } from 'react';
import { db } from '../utils/firebase';
import {
  collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, 
  query, orderBy, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';

const styles = {
  card: {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    padding: '16px 18px',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 12,
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  btn: {
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  btnActive: {
    background: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  slider: {
    flex: 1,
    height: 8,
    WebkitAppearance: 'none',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    outline: 'none',
  },
  volumeValue: {
    fontSize: 14,
    fontWeight: 800,
    minWidth: 45,
    textAlign: 'right',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  inputGroup: {
    display: 'flex',
    gap: 10,
  },
  input: {
    flex: 1,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  },
  inputSmall: {
    width: 100,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center',
  },
  btnAdd: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: 10,
    color: '#052e16',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  helpText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 1.5,
    marginTop: 4,
  },
  videoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  videoItem: {
    display: 'grid',
    gridTemplateColumns: '50px 1fr auto',
    gap: 12,
    alignItems: 'center',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
  },
  videoItemPlaying: {
    background: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  orderInput: {
    width: 50,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: 'inherit',
    textAlign: 'center',
    fontFamily: 'inherit',
  },
  videoInfo: {
    overflow: 'hidden',
  },
  videoName: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  videoUrl: {
    fontSize: 11,
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: 2,
  },
  videoActions: {
    display: 'flex',
    gap: 6,
  },
  smallBtn: {
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#f8fafc',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    color: '#ef4444',
  },
  nowPlaying: {
    padding: '12px 16px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: 10,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  nowPlayingDot: {
    width: 10,
    height: 10,
    background: '#22c55e',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  emptyState: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
};

// Converte link do Google Drive para link direto
function convertGoogleDriveUrl(url) {
  if (!url) return url;
  
  // Formato: https://drive.google.com/file/d/FILE_ID/view
  const match1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) {
    return `https://drive.google.com/uc?export=download&id=${match1[1]}`;
  }
  
  // Formato: https://drive.google.com/open?id=FILE_ID
  const match2 = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (match2) {
    return `https://drive.google.com/uc?export=download&id=${match2[1]}`;
  }
  
  // Já é link direto ou outro formato
  return url;
}

export default function VideoManager() {
  const [videos, setVideos] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [control, setControl] = useState({ playing: true, volume: 60, currentIndex: 0 });
  const debounceRef = useRef(null);

  // Carrega lista de vídeos
  useEffect(() => {
    const q = query(collection(db, 'videoPlaylist'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVideos(list);
    });
    return () => unsub();
  }, []);

  // Carrega estado de controle
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'videoControl'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setControl(prev => ({
          playing: typeof data.playing === 'boolean' ? data.playing : prev.playing,
          volume: Number.isFinite(data.volume) ? data.volume : prev.volume,
          currentIndex: Number.isFinite(data.currentIndex) ? data.currentIndex : prev.currentIndex,
        }));
      }
    });
    return () => unsub();
  }, []);

  // Atualiza controle no Firestore
  async function updateControl(updates) {
    try {
      const controlRef = doc(db, 'config', 'videoControl');
      const snap = await getDoc(controlRef);
      if (snap.exists()) {
        await updateDoc(controlRef, { ...updates, updatedAt: serverTimestamp() });
      } else {
        await setDoc(controlRef, { ...updates, updatedAt: serverTimestamp() });
      }
    } catch (err) {
      console.error('Erro ao atualizar controle:', err);
    }
  }

  // Play/Pause
  function togglePlay() {
    const newState = !control.playing;
    setControl(prev => ({ ...prev, playing: newState }));
    updateControl({ playing: newState });
  }

  // Volume
  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setControl(prev => ({ ...prev, volume: v }));
    
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateControl({ volume: v });
    }, 200);
  }

  // Próximo vídeo
  function nextVideo() {
    if (videos.length <= 1) return;
    const nextIndex = (control.currentIndex + 1) % videos.length;
    setControl(prev => ({ ...prev, currentIndex: nextIndex }));
    updateControl({ skipTo: nextIndex });
  }

  // Vídeo anterior
  function prevVideo() {
    if (videos.length <= 1) return;
    const prevIndex = control.currentIndex > 0 ? control.currentIndex - 1 : videos.length - 1;
    setControl(prev => ({ ...prev, currentIndex: prevIndex }));
    updateControl({ skipTo: prevIndex });
  }

  // Seleciona vídeo específico
  function selectVideo(index) {
    setControl(prev => ({ ...prev, currentIndex: index }));
    updateControl({ skipTo: index, playing: true });
  }

  // Reiniciar playlist
  function restartPlaylist() {
    setControl(prev => ({ ...prev, currentIndex: 0 }));
    updateControl({ skipTo: 0, playing: true });
  }

  // Adicionar vídeo por URL
  async function handleAddVideo() {
    if (!newUrl.trim()) {
      alert('Cole a URL do vídeo');
      return;
    }

    setAdding(true);
    try {
      // Converte URL do Google Drive se necessário
      const directUrl = convertGoogleDriveUrl(newUrl.trim());
      
      // Nome do vídeo
      const videoName = newName.trim() || `Vídeo ${videos.length + 1}`;
      
      // Determina ordem
      const maxOrder = videos.reduce((max, v) => Math.max(max, v.order || 0), 0);
      
      await addDoc(collection(db, 'videoPlaylist'), {
        name: videoName,
        url: directUrl,
        originalUrl: newUrl.trim(),
        order: maxOrder + 1,
        enabled: true,
        createdAt: serverTimestamp(),
      });

      setNewUrl('');
      setNewName('');
    } catch (err) {
      console.error('Erro ao adicionar:', err);
      alert('Erro ao adicionar vídeo.');
    } finally {
      setAdding(false);
    }
  }

  // Atualiza ordem
  async function updateOrder(id, newOrder) {
    try {
      await updateDoc(doc(db, 'videoPlaylist', id), { order: Number(newOrder) || 1 });
    } catch (err) {
      console.error('Erro ao atualizar ordem:', err);
    }
  }

  // Remove vídeo
  async function removeVideo(video) {
    if (!confirm(`Remover "${video.name}"?`)) return;
    
    try {
      await deleteDoc(doc(db, 'videoPlaylist', video.id));
    } catch (err) {
      console.error('Erro ao remover:', err);
      alert('Erro ao remover vídeo.');
    }
  }

  // Vídeo atual
  const currentVideo = videos[control.currentIndex];

  return (
    <div style={styles.card}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .control-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.1) !important;
        }
        .small-btn:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
        }
        .add-input:focus {
          border-color: #22c55e !important;
        }
        .btn-add:hover {
          opacity: 0.9;
        }
        .video-item:hover {
          background: rgba(255,255,255,0.04) !important;
        }
      `}</style>
      
      <div style={styles.header}>
        <span>🎬</span> Player de Vídeos
      </div>
      
      <div style={styles.body}>
        {/* Status atual */}
        {currentVideo && (
          <div style={styles.nowPlaying}>
            <div style={styles.nowPlayingDot}></div>
            <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {control.playing ? 'Tocando:' : 'Pausado:'} {currentVideo.name}
            </span>
          </div>
        )}

        {/* Controles */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Controles</div>
          <div style={styles.controlsGrid}>
            <button 
              style={{
                ...styles.btn,
                ...(videos.length <= 1 ? styles.btnDisabled : {}),
              }}
              className="control-btn"
              onClick={prevVideo}
              disabled={videos.length <= 1}
            >
              ⏮️ Anterior
            </button>
            <button 
              style={{
                ...styles.btn,
                ...(control.playing ? styles.btnActive : {}),
              }}
              className="control-btn"
              onClick={togglePlay}
            >
              {control.playing ? '⏸️ Pausar' : '▶️ Play'}
            </button>
            <button 
              style={{
                ...styles.btn,
                ...(videos.length <= 1 ? styles.btnDisabled : {}),
              }}
              className="control-btn"
              onClick={nextVideo}
              disabled={videos.length <= 1}
            >
              ⏭️ Próximo
            </button>
            <button 
              style={{
                ...styles.btn,
                ...(videos.length === 0 ? styles.btnDisabled : {}),
              }}
              className="control-btn"
              onClick={restartPlaylist}
              disabled={videos.length === 0}
            >
              🔄 Reiniciar
            </button>
          </div>
          
          {/* Volume */}
          <div style={styles.volumeContainer}>
            <span>🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              value={control.volume}
              onChange={handleVolumeChange}
              style={styles.slider}
            />
            <span style={styles.volumeValue}>{control.volume}%</span>
          </div>
        </div>

        {/* Adicionar vídeo */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Adicionar Vídeo</div>
          <div style={styles.addForm}>
            <input
              type="text"
              placeholder="Nome do vídeo (opcional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={styles.input}
              className="add-input"
            />
            <div style={styles.inputGroup}>
              <input
                type="text"
                placeholder="Cole a URL do vídeo (Google Drive, Dropbox, etc)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                style={styles.input}
                className="add-input"
                onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
              />
              <button
                onClick={handleAddVideo}
                disabled={adding || !newUrl.trim()}
                style={{
                  ...styles.btnAdd,
                  ...(adding || !newUrl.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
                className="btn-add"
              >
                {adding ? '...' : '➕ Adicionar'}
              </button>
            </div>
            <div style={styles.helpText}>
              <strong>Google Drive:</strong> Compartilhe o arquivo → "Qualquer pessoa com o link" → Cole o link aqui.<br/>
              <strong>Outros:</strong> Cole o link direto do arquivo MP4/WebM.
            </div>
          </div>
        </div>

        {/* Lista de vídeos */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Playlist ({videos.length} vídeos)</div>
          <div style={styles.videoList}>
            {videos.length > 0 ? (
              videos.map((video, index) => (
                <div 
                  key={video.id} 
                  style={{
                    ...styles.videoItem,
                    ...(index === control.currentIndex ? styles.videoItemPlaying : {}),
                  }}
                  className="video-item"
                >
                  <input
                    type="number"
                    value={video.order || 1}
                    onChange={(e) => updateOrder(video.id, e.target.value)}
                    style={styles.orderInput}
                    min={1}
                  />
                  <div style={styles.videoInfo}>
                    <div style={styles.videoName}>
                      {index === control.currentIndex && '▶️ '}
                      {video.name}
                    </div>
                    <div style={styles.videoUrl} title={video.originalUrl || video.url}>
                      {video.originalUrl || video.url}
                    </div>
                  </div>
                  <div style={styles.videoActions}>
                    <button
                      style={styles.smallBtn}
                      className="small-btn"
                      onClick={() => selectVideo(index)}
                      title="Reproduzir"
                    >
                      ▶️
                    </button>
                    <button
                      style={{ ...styles.smallBtn, ...styles.deleteBtn }}
                      className="small-btn delete-btn"
                      onClick={() => removeVideo(video)}
                      title="Remover"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                Nenhum vídeo adicionado ainda.<br/>
                Adicione um vídeo usando a URL acima.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
