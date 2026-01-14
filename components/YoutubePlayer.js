// components/YoutubePlayer.js - Versão robusta com watchdog anti-interrupção
import { useEffect, useRef, useCallback } from 'react';

export default function YoutubePlayer({ videoId, playlist = [] }) {
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const playlistRef = useRef(playlist);
  const retryCountRef = useRef(0);
  const watchdogRef = useRef(null);
  const lastPlayingTimeRef = useRef(Date.now());
  const isPlayingRef = useRef(false);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  // Função para garantir que o vídeo está tocando
  const ensurePlaying = useCallback(() => {
    if (!playerRef.current || !readyRef.current) return;
    
    try {
      const state = playerRef.current.getPlayerState?.();
      const YT = window.YT;
      
      if (!YT) return;
      
      // Se não está tocando (PLAYING = 1)
      if (state !== YT.PlayerState.PLAYING) {
        console.log('[YT Watchdog] Video not playing, state:', state, '- forcing play');
        playerRef.current.playVideo();
        
        // Se estava em BUFFERING por muito tempo, recarrega
        if (state === YT.PlayerState.BUFFERING) {
          const timeSinceLastPlay = Date.now() - lastPlayingTimeRef.current;
          if (timeSinceLastPlay > 15000) { // 15 segundos em buffering
            console.log('[YT Watchdog] Stuck in buffering, reloading video');
            const currentTime = playerRef.current.getCurrentTime?.() || 0;
            const id = playlistRef.current?.[0] || videoId;
            if (id) {
              playerRef.current.loadVideoById({ videoId: id, startSeconds: currentTime });
            }
          }
        }
      }
    } catch (e) {
      console.log('[YT Watchdog] Error checking state:', e);
    }
  }, [videoId]);

  // Watchdog timer - verifica a cada 5 segundos se o vídeo está tocando
  useEffect(() => {
    watchdogRef.current = setInterval(() => {
      ensurePlaying();
    }, 5000);

    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
      }
    };
  }, [ensurePlaying]);

  // Visibility API - detecta quando a página perde/ganha foco
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        console.log('[YT] Page visible - ensuring playback');
        setTimeout(() => {
          ensurePlaying();
        }, 500);
      }
    }

    function handleFocus() {
      console.log('[YT] Window focused - ensuring playback');
      setTimeout(() => {
        ensurePlaying();
      }, 500);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [ensurePlaying]);

  // Carrega a API e cria o player
  useEffect(() => {
    function create() {
      if (playerRef.current) return;

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
          origin: typeof window !== 'undefined' ? window.location.origin : '',
          // Playlist loop
          ...(playlist && playlist.length > 0 ? { loop: 1, playlist: playlist.join(',') } : {}),
        },
        events: {
          onReady: (ev) => {
            readyRef.current = true;
            retryCountRef.current = 0;
            lastPlayingTimeRef.current = Date.now();
            
            // Expõe o player globalmente para o tv-ducking.js
            window.tvYTPlayer = ev.target;
            
            console.log('[YT] Player ready');
            
            try {
              ev.target.playVideo();
              
              // Desmuta após 1.5 segundos
              setTimeout(() => {
                try {
                  const vol = (window.tvConfig && Number.isFinite(window.tvConfig.restoreVolume))
                    ? window.tvConfig.restoreVolume : 60;
                  ev.target.unMute();
                  ev.target.setVolume(vol);
                  console.log('[YT] Unmuted, volume:', vol);
                } catch {}
              }, 1500);
            } catch {}
          },
          onStateChange: (ev) => {
            const YT = window.YT;
            if (!YT) return;
            
            const stateNames = {
              [-1]: 'UNSTARTED',
              [0]: 'ENDED',
              [1]: 'PLAYING',
              [2]: 'PAUSED',
              [3]: 'BUFFERING',
              [5]: 'CUED'
            };
            console.log('[YT] State changed:', stateNames[ev.data] || ev.data);
            
            // Se está tocando
            if (ev.data === YT.PlayerState.PLAYING) {
              isPlayingRef.current = true;
              lastPlayingTimeRef.current = Date.now();
              retryCountRef.current = 0;
            } else {
              isPlayingRef.current = false;
            }
            
            // Se pausou, parou ou não iniciou - tenta dar play
            if (ev.data === YT.PlayerState.PAUSED || 
                ev.data === YT.PlayerState.UNSTARTED ||
                ev.data === YT.PlayerState.CUED) {
              if (retryCountRef.current < 10) {
                retryCountRef.current++;
                console.log('[YT] Attempting to resume playback, retry:', retryCountRef.current);
                setTimeout(() => {
                  try { ev.target.playVideo(); } catch {}
                }, 300 + (retryCountRef.current * 200));
              }
            }
            
            // Se terminou (vídeo único), faz loop
            if (ev.data === YT.PlayerState.ENDED) {
              if (!playlistRef.current || playlistRef.current.length === 0) {
                console.log('[YT] Video ended, looping');
                try { 
                  ev.target.seekTo(0); 
                  ev.target.playVideo(); 
                } catch {}
              }
            }
            
            // Se está em buffering por muito tempo
            if (ev.data === YT.PlayerState.BUFFERING) {
              setTimeout(() => {
                try {
                  const currentState = playerRef.current?.getPlayerState?.();
                  if (currentState === YT.PlayerState.BUFFERING) {
                    console.log('[YT] Still buffering after 10s, forcing play');
                    ev.target.playVideo();
                  }
                } catch {}
              }, 10000);
            }
          },
          onError: (ev) => {
            console.log('[YT] Error:', ev.data);
            
            // Códigos de erro do YouTube:
            // 2 = request contains invalid parameter
            // 5 = HTML5 player error
            // 100 = video not found
            // 101/150 = video not allowed for embedded playback
            
            if (retryCountRef.current < 5) {
              retryCountRef.current++;
              console.log('[YT] Retrying after error, attempt:', retryCountRef.current);
              
              setTimeout(() => {
                try {
                  const id = playlistRef.current?.[0] || videoId;
                  if (id) {
                    playerRef.current.loadVideoById(id);
                  }
                } catch {}
              }, 2000 * retryCountRef.current);
            }
          }
        }
      });
    }

    if (window.YT && window.YT.Player) {
      create();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => create();
    }

    return () => {
      try { 
        if (playerRef.current?.destroy) playerRef.current.destroy(); 
        window.tvYTPlayer = null;
      } catch {}
      playerRef.current = null;
      readyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Troca de vídeo único
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (playlist && playlist.length > 0) return;
    if (!videoId) return;
    try { 
      console.log('[YT] Loading single video:', videoId);
      playerRef.current.loadVideoById(videoId); 
    } catch {}
  }, [videoId, playlist]);

  // Volume control
  useEffect(() => {
    function setVol(v) {
      try {
        const p = playerRef.current;
        if (!p) return;
        if (v <= 0) { 
          p.mute?.(); 
          p.setVolume?.(0); 
        } else { 
          p.unMute?.(); 
          p.setVolume?.(v); 
        }
      } catch {}
    }
    
    function onVol(e) {
      const v = Number(e?.detail?.v);
      if (Number.isFinite(v)) {
        setVol(Math.max(0, Math.min(100, Math.round(v))));
      }
    }
    
    window.addEventListener('tv:ytVolume', onVol);
    return () => window.removeEventListener('tv:ytVolume', onVol);
  }, []);

  // Troca de playlist
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (playlist && playlist.length > 0) {
      try { 
        console.log('[YT] Loading playlist:', playlist);
        playerRef.current.loadPlaylist(playlist, 0, 0); 
      } catch {}
    }
  }, [playlist, videoId]);

  // Click/touch handler para garantir play em caso de bloqueio
  useEffect(() => {
    function handleInteraction() {
      if (playerRef.current && readyRef.current) {
        try {
          const state = playerRef.current.getPlayerState?.();
          if (state !== window.YT?.PlayerState?.PLAYING) {
            console.log('[YT] User interaction - starting playback');
            playerRef.current.playVideo();
            const vol = (window.tvConfig && Number.isFinite(window.tvConfig.restoreVolume))
              ? window.tvConfig.restoreVolume : 60;
            playerRef.current.unMute();
            playerRef.current.setVolume(vol);
          }
        } catch {}
      }
    }
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Keep-alive ping - previne que o Fire TV / Fully Kiosk entre em modo sleep
  useEffect(() => {
    const keepAlive = setInterval(() => {
      if (playerRef.current && readyRef.current) {
        try {
          // Apenas lê o tempo atual para manter o player ativo
          playerRef.current.getCurrentTime?.();
        } catch {}
      }
    }, 30000); // A cada 30 segundos

    return () => clearInterval(keepAlive);
  }, []);

  return (
    <div className="yt-wrap">
      <div className="yt-inner">
        <div id="yt-player" ref={iframeRef}></div>
      </div>
      <style jsx>{`
        .yt-wrap { 
          position: relative; 
          width: 100%; 
          height: 100%; 
          background: #000;
        }
        .yt-inner { 
          position: absolute; 
          inset: 0; 
        }
        #yt-player, 
        #yt-player iframe { 
          width: 100% !important; 
          height: 100% !important; 
          border: 0;
        }
      `}</style>
    </div>
  );
}
