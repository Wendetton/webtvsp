// components/YoutubePlayer.js - Autoplay garantido para Fire TV / Fully Kiosk
import { useEffect, useRef } from 'react';

export default function YoutubePlayer({ videoId, playlist = [] }) {
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const playlistRef = useRef(playlist);
  const retryCountRef = useRef(0);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

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
          // Autoplay configs para Fire TV / WebView
          autoplay: 1,
          mute: 1, // Comeca mudo para garantir autoplay
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
            
            // Inicia o video e depois desmuta
            try {
              ev.target.playVideo();
              
              // Aguarda um pouco e desmuta
              setTimeout(() => {
                try {
                  const vol = (window.tvConfig && Number.isFinite(window.tvConfig.restoreVolume))
                    ? window.tvConfig.restoreVolume : 60;
                  ev.target.unMute();
                  ev.target.setVolume(vol);
                } catch {}
              }, 1000);
            } catch {}
          },
          onStateChange: (ev) => {
            const YT = window.YT;
            if (!YT) return;
            
            // Se pausou ou parou, tenta dar play novamente (Fire TV pode pausar)
            if (ev.data === YT.PlayerState.PAUSED || ev.data === YT.PlayerState.UNSTARTED) {
              if (retryCountRef.current < 5) {
                retryCountRef.current++;
                setTimeout(() => {
                  try { ev.target.playVideo(); } catch {}
                }, 500);
              }
            }
            
            // Se terminou (video unico), loop
            if (ev.data === YT.PlayerState.ENDED && (!playlistRef.current || playlistRef.current.length === 0)) {
              try { ev.target.seekTo(0); ev.target.playVideo(); } catch {}
            }
            
            // Se esta tocando, reseta o contador de retry
            if (ev.data === YT.PlayerState.PLAYING) {
              retryCountRef.current = 0;
            }
          },
          onError: (ev) => {
            // Em caso de erro, tenta recarregar o video
            console.log('YouTube error:', ev.data);
            if (retryCountRef.current < 3) {
              retryCountRef.current++;
              setTimeout(() => {
                try {
                  const id = playlistRef.current?.[0] || videoId;
                  if (id) ev.target.loadVideoById(id);
                } catch {}
              }, 2000);
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
      try { if (playerRef.current?.destroy) playerRef.current.destroy(); } catch {}
      playerRef.current = null;
      readyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Troca de video unico
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (playlist && playlist.length > 0) return;
    if (!videoId) return;
    try { playerRef.current.loadVideoById(videoId); } catch {}
  }, [videoId, playlist]);

  // Volume control
  useEffect(() => {
    function setVol(v) {
      try {
        const p = playerRef.current;
        if (!p) return;
        if (v <= 0) { p.mute?.(); p.setVolume?.(0); }
        else { p.unMute?.(); p.setVolume?.(v); }
      } catch {}
    }
    function onVol(e) {
      const v = Number(e?.detail?.v);
      if (Number.isFinite(v)) setVol(Math.max(0, Math.min(100, Math.round(v))));
    }
    window.addEventListener('tv:ytVolume', onVol);
    return () => window.removeEventListener('tv:ytVolume', onVol);
  }, []);

  // Troca de playlist
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;
    if (playlist && playlist.length > 0) {
      try { playerRef.current.loadPlaylist(playlist, 0, 0); } catch {}
    }
  }, [playlist, videoId]);

  // Click handler para garantir play em caso de bloqueio de autoplay
  useEffect(() => {
    function handleClick() {
      if (playerRef.current && readyRef.current) {
        try {
          playerRef.current.playVideo();
          const vol = (window.tvConfig && Number.isFinite(window.tvConfig.restoreVolume))
            ? window.tvConfig.restoreVolume : 60;
          playerRef.current.unMute();
          playerRef.current.setVolume(vol);
        } catch {}
      }
    }
    
    // Adiciona listener no documento inteiro
    document.addEventListener('click', handleClick, { once: false });
    document.addEventListener('touchstart', handleClick, { once: false });
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
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
