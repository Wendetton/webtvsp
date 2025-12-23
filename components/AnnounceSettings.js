// components/AnnounceSettings.js - Redesenhado para modal
import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const styles = {
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldFull: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#94a3b8",
  },
  input: {
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#f8fafc",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  },
  select: {
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#f8fafc",
    fontSize: 14,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  textarea: {
    padding: "12px 14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#f8fafc",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    minHeight: 60,
  },
  rangeValue: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  btnSave: {
    padding: "12px 24px",
    background: "#22c55e",
    border: "none",
    borderRadius: 10,
    color: "#052e16",
    fontSize: 14,
    fontWeight: 800,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  savedMsg: {
    color: "#22c55e",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
  },
  errorMsg: {
    color: "#ef4444",
    marginBottom: 16,
    fontSize: 14,
  },
};

export default function AnnounceSettings({ embedded = false }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Campos
  const [announceMode, setAnnounceMode] = useState('auto');
  const [announceTemplate, setAnnounceTemplate] = useState('Atencao: paciente {{nome}}. Dirija-se a sala {{salaTxt}}.');
  const [duckVolume, setDuckVolume] = useState(20);
  const [restoreVolume, setRestoreVolume] = useState(60);
  const [leadMs, setLeadMs] = useState(450);
  const [accentColor, setAccentColor] = useState('#44b2e7');
  const [idleSeconds, setIdleSeconds] = useState(120);

  // Carregar config
  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, 'config', 'main');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          if (data.announceMode) setAnnounceMode(String(data.announceMode));
          if (data.announceTemplate) setAnnounceTemplate(String(data.announceTemplate));
          if (Number.isFinite(data.duckVolume)) setDuckVolume(Number(data.duckVolume));
          if (Number.isFinite(data.restoreVolume)) setRestoreVolume(Number(data.restoreVolume));
          if (Number.isFinite(data.leadMs)) setLeadMs(Number(data.leadMs));
          if (data.accentColor) setAccentColor(String(data.accentColor));
          if (Number.isFinite(data.idleSeconds)) setIdleSeconds(Math.min(300, Math.max(60, Number(data.idleSeconds))));
        }
      } catch (err) {
        setLoadError('Nao foi possivel carregar as configuracoes.');
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
        announceMode,
        announceTemplate,
        duckVolume: Number(duckVolume),
        restoreVolume: Number(restoreVolume),
        leadMs: Number(leadMs),
        accentColor: String(accentColor),
        idleSeconds: Math.min(300, Math.max(60, Number(idleSeconds))),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setLoadError('Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        .config-input:focus {
          border-color: #22c55e !important;
        }
        .config-select option {
          background: #1f2937;
          color: #f8fafc;
        }
        .btn-save:hover:not(:disabled) {
          background: #16a34a !important;
        }
      `}</style>

      <div>
        {loadError && <div style={styles.errorMsg}>{loadError}</div>}

        {/* Anuncio de Voz */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Anuncio de Voz</h3>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Modo de anuncio</label>
              <select
                value={announceMode}
                onChange={(e) => setAnnounceMode(e.target.value)}
                style={styles.select}
                className="config-select"
              >
                <option value="auto">Automatico (voz + beep)</option>
                <option value="beep">Som simples (beep)</option>
                <option value="off">Sem som</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Cor de destaque (TV)</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{ ...styles.input, padding: 6, height: 44 }}
                className="config-input"
              />
            </div>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Frase do anuncio</label>
              <textarea
                value={announceTemplate}
                onChange={(e) => setAnnounceTemplate(e.target.value)}
                style={styles.textarea}
                className="config-input"
                rows={2}
              />
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Use {'{{nome}}'}, {'{{sala}}'} e {'{{salaTxt}}'}.
              </div>
            </div>
          </div>
        </div>

        {/* Volume */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Volume</h3>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Volume durante anuncio</label>
              <input
                type="range"
                min={0}
                max={100}
                value={duckVolume}
                onChange={(e) => setDuckVolume(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={styles.rangeValue}>{duckVolume}%</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Volume apos anuncio</label>
              <input
                type="range"
                min={0}
                max={100}
                value={restoreVolume}
                onChange={(e) => setRestoreVolume(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={styles.rangeValue}>{restoreVolume}%</div>
            </div>
          </div>
        </div>

        {/* Temporizacao */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Temporizacao</h3>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Antecipacao do ducking (ms)</label>
              <input
                type="number"
                min={0}
                max={2000}
                step={50}
                value={leadMs}
                onChange={(e) => setLeadMs(Number(e.target.value))}
                style={styles.input}
                className="config-input"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Tempo para voltar ao logo (s)</label>
              <input
                type="number"
                min={60}
                max={300}
                step={10}
                value={idleSeconds}
                onChange={(e) => setIdleSeconds(Number(e.target.value))}
                style={styles.input}
                className="config-input"
              />
            </div>
          </div>
        </div>

        {/* Botao Salvar */}
        <div style={styles.footer}>
          {saved && <span style={styles.savedMsg}>Salvo!</span>}
          <button
            onClick={save}
            disabled={saving}
            style={{
              ...styles.btnSave,
              opacity: saving ? 0.6 : 1,
            }}
            className="btn-save"
          >
            {saving ? 'Salvando...' : 'Salvar Configuracoes'}
          </button>
        </div>
      </div>
    </>
  );
}
