import { useRef, useState, useEffect } from 'react';
import { UploadCloud, Mail, FileText, Check } from 'lucide-react';
import './UploadButton.css';

/**
 * UploadButton
 * Props:
 *   onUpload      {Function}  — called with the selected File (PDF mode)
 *   startGmailSync {Function} — triggers Gmail scan flow
 *   isLoading     {boolean}
 *   syncStatus    {string}    — 'idle'|'scanning'|'parsing'|'done'|'error'
 */
export default function UploadButton({
  onUpload,
  startGmailSync,
  isLoading = false,
  syncStatus = 'idle',
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const fileInputRef = useRef(null);

  const isBusy = isLoading || syncStatus === 'scanning' || syncStatus === 'parsing';

  // When sync finishes successfully, flash ✓ then reset
  useEffect(() => {
    if (syncStatus === 'done') {
      setSuccessFlash(true);
      setShowOptions(false);
      const t = setTimeout(() => setSuccessFlash(false), 1800);
      return () => clearTimeout(t);
    }
  }, [syncStatus]);

  const handleMainPress = () => {
    if (isBusy) return;
    setShowOptions((prev) => !prev);
  };

  const handleGmail = () => {
    setShowOptions(false);
    startGmailSync?.();
  };

  const handlePdfClick = () => {
    setShowOptions(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload?.(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const buttonLabel = () => {
    if (successFlash) return 'Tamamlandı';
    if (syncStatus === 'scanning') return 'Taranıyor...';
    if (syncStatus === 'parsing') return 'Analiz ediliyor...';
    if (isLoading) return 'Yükleniyor...';
    return 'Ekstre Yükle';
  };

  return (
    <div className="upload-btn-wrap">
      {/* Option buttons — shown above the main CTA */}
      {showOptions && (
        <div className="upload-options">
          <button className="upload-option-btn" onClick={handleGmail}>
            <span className="upload-option-btn__icon upload-option-btn__icon--gmail">
              <Mail size={20} />
            </span>
            <span className="upload-option-btn__text">
              <span className="upload-option-btn__label">Gmail ile Tara</span>
              <span className="upload-option-btn__desc">
                Gmail'inizdeki banka ekstrelerini otomatik bul
              </span>
            </span>
          </button>

          <button className="upload-option-btn" onClick={handlePdfClick}>
            <span className="upload-option-btn__icon upload-option-btn__icon--pdf">
              <FileText size={20} />
            </span>
            <span className="upload-option-btn__text">
              <span className="upload-option-btn__label">PDF Yükle</span>
              <span className="upload-option-btn__desc">
                Telefonunuzdan PDF ekstre seçin
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Main CTA */}
      <button
        className={`upload-btn${isBusy ? ' upload-btn--loading' : ''}${successFlash ? ' upload-btn--success' : ''}`}
        onClick={handleMainPress}
        disabled={isBusy}
      >
        {isBusy ? (
          <span className="upload-btn__spinner" />
        ) : successFlash ? (
          <Check size={20} />
        ) : (
          <UploadCloud size={20} />
        )}
        {buttonLabel()}
      </button>
    </div>
  );
}
