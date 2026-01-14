// components/VideoManager.js - Gerenciador de vídeos para o admin
import { useEffect, useState, useRef } from 'react';
import { db, storage } from '../utils/firebase';
import {
  collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, 
  query, orderBy, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

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
  uploadArea: {
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: 16,
  },
  uploadAreaHover: {
    borderColor: '#22c55e',
    background: 'rgba(34, 197, 94, 0.1)',
  },
  fileInput: {
    display: 'none',
  },
  progressBar: {
    width: '100%',
    height: 8,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
    transition: 'width 0.3s',
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
  videoName: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
};

export default function VideoManager() {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [control, setControl] = useState({ playing: true, volume: 60, currentIndex: 0 });
  const fileInputRef = useRef(null);
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
    
    // Debounce para não sobrecarregar o Firestore
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateControl({ volume: v });
    }, 200);
  }

  // Próximo vídeo
  function nextVideo() {
    const nextIndex = (control.currentIndex + 1) % Math.max(1, videos.length);
    setControl(prev => ({ ...prev, currentIndex: nextIndex }));
    updateControl({ skipTo: nextIndex, next: false, prev: false });
  }

  // Vídeo anterior
  function prevVideo() {
    const prevIndex = control.currentIndex > 0 ? control.currentIndex - 1 : Math.max(0, videos.length - 1);
    setControl(prev => ({ ...prev, currentIndex: prevIndex }));
    updateControl({ skipTo: prevIndex, next: false, prev: false });
  }

  // Seleciona vídeo específico
  function selectVideo(index) {
    setControl(prev => ({ ...prev, currentIndex: index }));
    updateControl({ skipTo: index, playing: true });
  }

  // Upload de vídeo
  async function handleUpload(file) {
    if (!file || !file.type.startsWith('video/')) {
      alert('Por favor, selecione um arquivo de vídeo válido.');
      return;
    }

    // Limite de 100MB para Firebase Storage gratuito
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('O arquivo é muito grande. Máximo permitido: 100MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Gera nome único
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `videos/${timestamp}_${safeName}`;
      const storageRef = ref(storage, fileName);

      // Upload com progresso
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Erro no upload:', error);
          alert('Erro ao fazer upload do vídeo.');
          setUploading(false);
        },
        async () => {
          // Upload completo - pega URL e salva no Firestore
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Determina ordem (último + 1)
          const maxOrder = videos.reduce((max, v) => Math.max(max, v.order || 0), 0);
          
          await addDoc(collection(db, 'videoPlaylist'), {
            name: file.name,
            url: downloadURL,
            storagePath: fileName,
            order: maxOrder + 1,
            enabled: true,
            createdAt: serverTimestamp(),
          });

          setUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao processar upload.');
      setUploading(false);
    }
  }

  // Drag and drop
  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleUpload(file);
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
      // Remove do Storage
      if (video.storagePath) {
        const storageRef = ref(storage, video.storagePath);
        await deleteObject(storageRef).catch(() => {});
      }
      
      // Remove do Firestore
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
        .upload-area:hover {
          border-color: #22c55e !important;
          background: rgba(34, 197, 94, 0.1) !important;
        }
        .video-item:hover {
          background: rgba(255,255,255,0.04) !important;
        }
        .control-btn:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        .small-btn:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
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
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {control.playing ? 'Tocando:' : 'Pausado:'} {currentVideo.name}
            </span>
          </div>
        )}

        {/* Controles */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Controles</div>
          <div style={styles.controlsGrid}>
            <button 
              style={styles.btn} 
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
              style={styles.btn}
              className="control-btn"
              onClick={nextVideo}
              disabled={videos.length <= 1}
            >
              ⏭️ Próximo
            </button>
            <button 
              style={styles.btn}
              className="control-btn"
              onClick={() => selectVideo(0)}
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

        {/* Upload */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Adicionar Vídeo</div>
          <div
            style={{
              ...styles.uploadArea,
              ...(dragOver ? styles.uploadAreaHover : {}),
            }}
            className="upload-area"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={styles.fileInput}
            />
            {uploading ? (
              <>
                <div style={{ marginBottom: 8 }}>Enviando... {uploadProgress}%</div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }}></div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📤</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Clique ou arraste um vídeo aqui
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Formatos: MP4, WebM, MOV (máx. 100MB)
                </div>
              </>
            )}
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
                  <div style={styles.videoName} title={video.name}>
                    {index === control.currentIndex && '▶️ '}
                    {video.name}
                  </div>
                  <div style={styles.videoActions}>
                    <button
                      style={styles.smallBtn}
                      className="small-btn"
                      onClick={() => selectVideo(index)}
                    >
                      ▶️
                    </button>
                    <button
                      style={{ ...styles.smallBtn, ...styles.deleteBtn }}
                      className="small-btn delete-btn"
                      onClick={() => removeVideo(video)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 20 }}>
                Nenhum vídeo adicionado ainda
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
