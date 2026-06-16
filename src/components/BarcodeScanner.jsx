import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null)
  const [error, setError] = useState('')
  const elementId = 'barcode-reader'

  useEffect(() => {
    let scanner

    async function start() {
      try {
        scanner = new Html5Qrcode(elementId)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          async (decodedText) => {
            onDetected(decodedText)
            await scanner.stop()
            onClose()
          }
        )
      } catch (err) {
        setError('Não foi possível acessar a câmera. Verifique a permissão do navegador.')
      }
    }

    start()

    return () => {
      if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {})
    }
  }, [])

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Escanear código de barras</h3>
        <p>Aponte a câmera para o código do item.</p>
        <div id={elementId} className="scanner-box" />
        {error && <p className="error-text">{error}</p>}
        <button className="btn secondary" onClick={onClose}>Fechar</button>
      </div>
    </div>
  )
}
