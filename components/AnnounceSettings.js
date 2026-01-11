// components/AnnounceSettings.js - Configurações personalizadas da TV
import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function AnnounceSettings() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Frase do anúncio
  const [announceTemplate, setAnnounceTemplate] = useState('Atenção: paciente {{nome}}. Dirija-se à sala {{salaTxt}}.');

  // Personalização do Consultório
  const [roomFontSize, setRoomFontSize] = useState(100); // porcentagem (50-150)
  const [roomColor, setRoomColor] = useState('#44b2e7');

  // Tempo do carrossel
  const [carouselDuration, setCarouselDuration] = useState(7); // segundos (3-30)

  // Cores do layout da TV
  const [tvBgColor, setTvBgColor] = useState('#0b1220');
  const [tvPanelColor, setTvPanelColor] = useState('#0e1626');
  const [tvAccentColor, setTvAccentColor] = useState('#44b2e7');
  const [tvTextColor, setTvTextColor] = useState('#fefefe');

  // Carregar config/main
  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, 'config', 'main');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          if (data.announceTemplate) setAnnounceTemplate(String(data.announceTemplate));
          if (Number.isFinite(data.roomFontSize)) setRoomFontSize(Number(data.roomFontSize));
          if (data.roomColor) setRoomColor(String(data.roomColor));
          if (Number.isFinite(data.carouselDuration)) setCarouselDuration(Number(data.carouselDuration));
          if (data.tvBgColor) setTvBgColor(String(data.tvBgColor));
          if (data.tvPanelColor) setTvPanelColor(String(data.tvPanelColor));
          if (data.tvAccentColor) setTvAccentColor(String(data.tvAccentColor));
          if (data.tvTextColor) setTvTextColor(String(data.tvTextColor));
        }
      } catch (err) {
        setLoadError('Não foi possível carregar as configurações.');
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setLoadError('');
    try {
      const ref = doc(db, 'config', 'main');
      await setDoc(ref, {
        announceTemplate,
        roomFontSize: Number(roomFontSize),
        roomColor: String(roomColor),
        carouselDuration: Number(carouselDuration),
        tvBgColor: String(tvBgColor),
        tvPanelColor: String(tvPanelColor),
        tvAccentColor: String(tvAccentColor),
        tvTextColor: String(tvTextColor),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setLoadError('Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  // Reset para cores padrão
  function resetColors() {
    setTvBgColor('#0b1220');
    setTvPanelColor('#0e1626');
    setTvAccentColor('#44b2e7');
    setTvTextColor('#fefefe');
    setRoomColor('#44b2e7');
  }

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    },
    section: {
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    row: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: 600,
      color: '#e2e8f0',
    },
    sublabel: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 4,
    },
    textarea: {
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '2px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      color: '#f8fafc',
      fontSize: 14,
      fontFamily: 'inherit',
      resize: 'vertical',
      minHeight: 80,
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
    },
    grid4: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
    },
    colorInput: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    colorPicker: {
      width: '100%',
      height: 44,
      padding: 4,
      background: 'rgba(255,255,255,0.03)',
      border: '2px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      cursor: 'pointer',
    },
    colorLabel: {
      fontSize: 12,
      color: '#94a3b8',
      textAlign: 'center',
    },
    rangeContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    rangeValue: {
      fontSize: 13,
      color: '#94a3b8',
      textAlign: 'right',
    },
    range: {
      width: '100%',
      accentColor: '#22c55e',
    },
    previewBox: {
      marginTop: 12,
      padding: 16,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 8,
    },
    btnSave: {
      padding: '14px 28px',
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      border: 'none',
      borderRadius: 12,
      color: '#052e16',
      fontSize: 16,
      fontWeight: 800,
      fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    btnReset: {
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      color: '#94a3b8',
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'inherit',
      cursor: 'pointer',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      marginTop: 8,
    },
    savedMsg: {
      marginLeft: 12,
      color: '#4ade80',
      fontWeight: 700,
      fontSize: 14,
    },
    errorMsg: {
      color: '#f87171',
      fontSize: 14,
      marginBottom: 12,
    },
  };

  return (
    <div style={styles.container}>
      {loadError && <div style={styles.errorMsg}>{loadError}</div>}

      {/* Frase do Anúncio */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>🔊</span> Frase do Anúncio
        </div>
        <div style={styles.row}>
          <label style={styles.label}>Template da mensagem de voz</label>
          <textarea
            value={announceTemplate}
            onChange={(e) => setAnnounceTemplate(e.target.value)}
            style={styles.textarea}
            rows={3}
          />
          <div style={styles.sublabel}>
            Use <code style={{background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:4}}>{'{{nome}}'}</code> para o nome do paciente, 
            <code style={{background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:4, marginLeft:4}}>{'{{sala}}'}</code> para o número e 
            <code style={{background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:4, marginLeft:4}}>{'{{salaTxt}}'}</code> para "número X".
          </div>
        </div>
      </section>

      {/* Personalização do Consultório */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>🏥</span> Texto do Consultório
        </div>
        <div style={styles.grid2}>
          <div style={styles.rangeContainer}>
            <label style={styles.label}>Tamanho da fonte</label>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={roomFontSize}
              onChange={(e) => setRoomFontSize(Number(e.target.value))}
              style={styles.range}
            />
            <div style={styles.rangeValue}>{roomFontSize}%</div>
          </div>
          <div style={styles.colorInput}>
            <label style={styles.label}>Cor do texto</label>
            <input
              type="color"
              value={roomColor}
              onChange={(e) => setRoomColor(e.target.value)}
              style={styles.colorPicker}
            />
          </div>
        </div>
        {/* Preview */}
        <div style={{...styles.previewBox, background: tvPanelColor, border: `2px solid ${tvAccentColor}`}}>
          <span style={{fontSize: 12, color: '#94a3b8', marginBottom: 4}}>Preview:</span>
          <span style={{
            fontSize: `${Math.round(24 * roomFontSize / 100)}px`,
            fontWeight: 800,
            color: roomColor,
          }}>
            Consultório 1
          </span>
        </div>
      </section>

      {/* Tempo do Carrossel */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>🖼️</span> Carrossel de Imagens
        </div>
        <div style={styles.rangeContainer}>
          <label style={styles.label}>Tempo de exibição de cada imagem</label>
          <input
            type="range"
            min={3}
            max={30}
            step={1}
            value={carouselDuration}
            onChange={(e) => setCarouselDuration(Number(e.target.value))}
            style={styles.range}
          />
          <div style={styles.rangeValue}>{carouselDuration} segundos</div>
        </div>
      </section>

      {/* Cores do Layout */}
      <section style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>🎨</span> Cores do Layout da TV
        </div>
        <div style={styles.grid4}>
          <div style={styles.colorInput}>
            <input
              type="color"
              value={tvBgColor}
              onChange={(e) => setTvBgColor(e.target.value)}
              style={styles.colorPicker}
            />
            <span style={styles.colorLabel}>Fundo</span>
          </div>
          <div style={styles.colorInput}>
            <input
              type="color"
              value={tvPanelColor}
              onChange={(e) => setTvPanelColor(e.target.value)}
              style={styles.colorPicker}
            />
            <span style={styles.colorLabel}>Painel</span>
          </div>
          <div style={styles.colorInput}>
            <input
              type="color"
              value={tvAccentColor}
              onChange={(e) => setTvAccentColor(e.target.value)}
              style={styles.colorPicker}
            />
            <span style={styles.colorLabel}>Destaque</span>
          </div>
          <div style={styles.colorInput}>
            <input
              type="color"
              value={tvTextColor}
              onChange={(e) => setTvTextColor(e.target.value)}
              style={styles.colorPicker}
            />
            <span style={styles.colorLabel}>Texto</span>
          </div>
        </div>
        {/* Preview do layout */}
        <div style={{
          ...styles.previewBox,
          background: tvBgColor,
          border: `2px solid ${tvAccentColor}`,
          marginTop: 16,
        }}>
          <span style={{fontSize: 12, color: '#94a3b8', marginBottom: 8}}>Preview do layout:</span>
          <div style={{
            background: tvPanelColor,
            padding: '12px 20px',
            borderRadius: 8,
            border: `1px solid ${tvAccentColor}`,
            textAlign: 'center',
          }}>
            <div style={{fontSize: 11, color: '#94a3b8', marginBottom: 4}}>CHAMANDO AGORA</div>
            <div style={{fontSize: 18, fontWeight: 800, color: tvTextColor}}>Maria da Silva</div>
            <div style={{fontSize: 14, fontWeight: 700, color: roomColor, marginTop: 4}}>Consultório 2</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div style={styles.footer}>
        <button onClick={resetColors} style={styles.btnReset}>
          Restaurar cores padrão
        </button>
        <div style={{display: 'flex', alignItems: 'center'}}>
          <button onClick={save} disabled={saving} style={styles.btnSave}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          {saved && <span style={styles.savedMsg}>✓ Salvo!</span>}
        </div>
      </div>
    </div>
  );
}
