// components/YoutubePlayer.js - Otimizado para Fire TV Stick
import { useEffect, useRef, useCallback } from 'react';

export default function YoutubePlayer({ videoId, playlist = [] }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const playlistRef = useRef(playlist);
  const mountedRef = useRef(true);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  // Função para manter Fire TV acordado - simula atividade
  const keepAwake = useCallback(() => {
    if (!mountedRef.current) return;
    
    // Técnica 1: Força um micro-scroll para simular atividade
    try {
      window.scrollTo(0, window.scrollY);
    } catch {}
    
    // Técnica 2: Dispara evento de usuário sintético
    try {
      const event = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: Math.random() * 10,
        clientY: Math.random() * 10
      });
      document.dispatchEvent(event);
    } catch {}
  }, []);

  // Keep-alive agressivo para Fire TV - a cada 10 segundos
  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(keepAwake, 10000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [keepAwake]);

  // Previne que o Fire TV entre em modo de economia
  useEffect(() => {
    // Solicita wake lock se disponível (Chrome/Android)
    let wakeLock = null;
    
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('[YT] Wake lock ativo');
        }
      } catch (err) {
        console.log('[YT] Wake lock não disponível:', err);
      }
    }
    
    requestWakeLock();
    
    // Re-adquire wake lock quando a página volta ao foco
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Cria o player
  useEffect(() => {
    function create() {
      if (playerRef.current || !iframeRef.current) return;

      const initialId = (playlist && playlist.length > 0) ? playlist[0] : (videoId || '');

      playerRef.current = new window.YT.Player(iframeRef.current, {
        width: '100%',
        height: '100%',
        videoId: initialId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          // Importante para Fire TV
          origin: typeof window !== 'undefined' ? window.location.origin : '',
          // Playlist config
          ...(playlist && playlist.length > 0 ? { loop: 1, playlist: playlist.join(',') } : { loop: 1 }),
        },
        events: {
          onReady: (ev) => {
            readyRef.current = true;
            window.tvYTPlayer = ev.target;
            
            console.log('[YT] Player pronto');
            
            try {
              ev.target.playVideo();
              
              // Desmuta após delay
              setTimeout(() => {
                if (!mountedRef.current) return;
                try {
                  const vol = (window.tvConfig?.restoreVolume) || 60;
                  ev.target.unMute();
                  ev.target.setVolume(vol);
                } catch {}
              }, 1500);
            } catch {}
          },
          onStateChange: (ev) => {
            const YT = window.YT;
            if (!YT || !mountedRef.current) return;
            
            // Log para debug
            const states = { [-1]: 'UNSTARTED', 0: 'ENDED', 1: 'PLAYING', 2: 'PAUSED', 3: 'BUFFERING', 5: 'CUED' };
            console.log('[YT] Estado:', states[ev.data] || ev.data);
            
            // Se não está tocando, tenta retomar
            if (ev.data === YT.PlayerState.PAUSED || ev.data === YT.PlayerState.UNSTARTED) {
              setTimeout(() => {
                if (!mountedRef.current) return;
                try { ev.target.playVideo(); } catch {}
              }, 500);
            }
            
            // Loop para vídeo único
            if (ev.data === YT.PlayerState.ENDED) {
              if (!playlistRef.current?.length) {
                try { 
                  ev.target.seekTo(0); 
                  ev.target.playVideo(); 
                } catch {}
              }
            }
          },
          onError: (ev) => {
            console.log('[YT] Erro:', ev.data);
            setTimeout(() => {
              if (!mountedRef.current) return;
              try {
                const id = playlistRef.current?.[0] || videoId;
                if (id) playerRef.current?.loadVideoById(id);
              } catch {}
            }, 3000);
          }
        }
      });
    }

    // Carrega API do YouTube
    if (window.YT?.Player) {
      create();
    } else {
      // Evita carregar script duplicado
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = create;
    }

    return () => {
      mountedRef.current = false;
      try { 
        playerRef.current?.destroy(); 
        window.tvYTPlayer = null;
      } catch {}
      playerRef.current = null;
      readyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza vídeo único
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (playlist?.length > 0) return;
    if (!videoId) return;
    try { playerRef.current.loadVideoById(videoId); } catch {}
  }, [videoId, playlist]);

  // Atualiza playlist
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (playlist?.length > 0) {
      try { playerRef.current.loadPlaylist(playlist, 0, 0); } catch {}
    }
  }, [playlist]);

  // Controle de volume externo
  useEffect(() => {
    function handleVolume(e) {
      const v = Number(e?.detail?.v);
      if (!Number.isFinite(v) || !playerRef.current) return;
      try {
        if (v <= 0) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
          playerRef.current.setVolume(v);
        }
      } catch {}
    }
    
    window.addEventListener('tv:ytVolume', handleVolume);
    return () => window.removeEventListener('tv:ytVolume', handleVolume);
  }, []);

  // Interação do usuário para garantir autoplay
  useEffect(() => {
    function handleInteraction() {
      if (!playerRef.current || !readyRef.current) return;
      try {
        const state = playerRef.current.getPlayerState?.();
        if (state !== window.YT?.PlayerState?.PLAYING) {
          playerRef.current.playVideo();
          playerRef.current.unMute();
          playerRef.current.setVolume(window.tvConfig?.restoreVolume || 60);
        }
      } catch {}
    }
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <div 
          id="yt-player" 
          ref={iframeRef}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <style jsx global>{`
        #yt-player iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
        }
      `}</style>
    </div>
  );
}
