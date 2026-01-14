// components/YoutubePlayer.js - Versão com iframe direto (sem API do YouTube)
// Esta versão usa embed direto para testar se o problema é da API

import { useEffect, useRef, useState, useMemo } from 'react';

export default function YoutubePlayer({ videoId, playlist = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(60);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Determina o vídeo atual
  const currentVideoId = useMemo(() => {
    if (playlist && playlist.length > 0) {
      return playlist[currentIndex % playlist.length];
    }
    return videoId || '';
  }, [playlist, currentIndex, videoId]);

  // URL do embed com parâmetros otimizados para Fire TV
  const embedUrl = useMemo(() => {
    if (!currentVideoId) return '';
    
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '0',
      controls: '0',
      modestbranding: '1',
      rel: '0',
      fs: '0',
      iv_load_policy: '3',
      playsinline: '1',
      loop: '1',
      // Se não tem playlist, usa o próprio vídeo como playlist para loop funcionar
      playlist: playlist.length > 0 ? playlist.join(',') : currentVideoId,
      enablejsapi: '0', // Desativa API para teste
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    });
    
    return `https://www.youtube.com/embed/${currentVideoId}?${params.toString()}`;
  }, [currentVideoId, playlist]);

  // Listener de volume
  useEffect(() => {
    function handleVolume(e) {
      const v = Number(e?.detail?.v);
      if (Number.isFinite(v)) {
        setVolume(Math.max(0, Math.min(100, v)));
      }
    }
    
    window.addEventListener('tv:ytVolume', handleVolume);
    return () => window.removeEventListener('tv:ytVolume', handleVolume);
  }, []);

  // Keep-alive para Fire TV
  useEffect(() => {
    const interval = setInterval(() => {
      // Simula atividade para manter Fire TV acordado
      try {
        window.scrollTo(0, window.scrollY);
        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: Math.random() * 10,
          clientY: Math.random() * 10
        });
        document.dispatchEvent(event);
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Wake Lock API
  useEffect(() => {
    let wakeLock = null;
    
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('[YT Embed] Wake lock ativo');
        }
      } catch {}
    }
    
    requestWakeLock();
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    });
    
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  if (!embedUrl) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666'
      }}>
        Configure um vídeo no Admin
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        background: '#000',
        overflow: 'hidden'
      }}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube Player"
      />
    </div>
  );
}
