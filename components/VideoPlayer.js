// components/VideoPlayer.js - Player HTML5 nativo otimizado para Fire TV
import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '../utils/firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(60);
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Carrega playlist do Firestore
  useEffect(() => {
    const q = query(collection(db, 'videoPlaylist'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => item.url && item.enabled !== false);
      setPlaylist(list);
      if (list.length > 0 && currentIndex >= list.length) {
        setCurrentIndex(0);
      }
    });
    return () => unsub();
  }, [currentIndex]);

  // Escuta comandos de controle do admin
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'videoControl'), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      // Volume
      if (Number.isFinite(data.volume)) {
        setVolume(Math.max(0, Math.min(100, data.volume)));
      }
      
      // Play/Pause
      if (typeof data.playing === 'boolean') {
        setIsPlaying(data.playing);
      }
      
      // Pular para vídeo específico
      if (Number.isFinite(data.skipTo) && data.skipTo >= 0) {
        setCurrentIndex(data.skipTo);
      }
      
      // Próximo vídeo
      if (data.next === true) {
        setCurrentIndex(prev => (prev + 1) % Math.max(1, playlist.length));
      }
      
      // Vídeo anterior
      if (data.prev === true) {
        setCurrentIndex(prev => prev > 0 ? prev - 1 : Math.max(0, playlist.length - 1));
      }
    });
    return () => unsub();
  }, [playlist.length]);

  // Aplica volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Aplica play/pause
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Quando o vídeo termina, vai para o próximo
  const handleEnded = useCallback(() => {
    if (playlist.length > 1) {
      setCurrentIndex(prev => (prev + 1) % playlist.length);
    } else if (videoRef.current) {
      // Se só tem um vídeo, reinicia
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [playlist.length]);

  // Erro no vídeo
  const handleError = useCallback((e) => {
    console.error('[VideoPlayer] Erro:', e);
    setError('Erro ao carregar vídeo');
    
    // Tenta o próximo vídeo após 3 segundos
    setTimeout(() => {
      if (mountedRef.current && playlist.length > 1) {
        setCurrentIndex(prev => (prev + 1) % playlist.length);
        setError(null);
      }
    }, 3000);
  }, [playlist.length]);

  // Vídeo carregou
  const handleCanPlay = useCallback(() => {
    setError(null);
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  // Listener de volume externo (compatibilidade com sistema existente)
  useEffect(() => {
    function handleVolumeEvent(e) {
      const v = Number(e?.detail?.v);
      if (Number.isFinite(v)) {
        setVolume(Math.max(0, Math.min(100, v)));
      }
    }
    
    window.addEventListener('tv:videoVolume', handleVolumeEvent);
    return () => window.removeEventListener('tv:videoVolume', handleVolumeEvent);
  }, []);

  // Click para iniciar reprodução (necessário em alguns dispositivos)
  useEffect(() => {
    function handleClick() {
      if (videoRef.current && isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
    
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isPlaying]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // URL do vídeo atual
  const currentVideo = playlist[currentIndex];
  const videoUrl = currentVideo?.url || '';

  // Se não tem vídeos
  if (playlist.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '1.5vh',
      }}>
        Nenhum vídeo configurado
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#000',
      overflow: 'hidden',
    }}>
      {error ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f66',
          fontSize: '1.5vh',
        }}>
          {error}
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          autoPlay
          muted={volume === 0}
          playsInline
          onEnded={handleEnded}
          onError={handleError}
          onCanPlay={handleCanPlay}
        />
      )}
    </div>
  );
}
