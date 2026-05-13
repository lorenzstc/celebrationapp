import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Fireworks } from "fireworks-js";
import confetti from "canvas-confetti";
import "./App.css";

const CelebrationApp = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [showWebcam, setShowWebcam] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState("Mega-Brain der Wissenschaft");
  const [inputName, setInputName] = useState("");
  const [scale, setScale] = useState(1);

  const webcamRef = useRef<Webcam | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);
  const certificateWrapperRef = useRef<HTMLDivElement>(null);
  const fireworksRef = useRef<Fireworks | null>(null);
  const fireworksContainerRef = useRef<HTMLDivElement | null>(null);

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: "user",
    frameRate: { ideal: 30, max: 60 }
  };

  const fireworkSounds = [
    "https://fireworks.js.org/sounds/explosion0.mp3",
    "https://fireworks.js.org/sounds/explosion1.mp3",
    "https://fireworks.js.org/sounds/explosion2.mp3"
  ];

  // Simple Synthesizer for countdown beep
  const playBeep = (freq = 800, type: OscillatorType = "sine") => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio block", e);
    }
  };

  const triggerConfetti = () => {
    const duration = 4000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
        colors: ['#d4af37', '#ffffff', '#ffd700']
      });
      confetti({
        particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
        colors: ['#d4af37', '#ffffff', '#ffd700']
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // certificate native width is 800px
        setScale(entry.contentRect.width / 800);
      }
    });

    if (certificateWrapperRef.current) {
      resizeObserver.observe(certificateWrapperRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [capturedImage]);

  useEffect(() => {
    const initializeFireworks = () => {
      if (!fireworksRef.current && fireworksContainerRef.current) {
        fireworksRef.current = new Fireworks(fireworksContainerRef.current, {
          autoresize: true, opacity: 0.7, acceleration: 1.05,
          particles: 100, explosion: 6, intensity: 30, friction: 0.97, gravity: 1.5,
          sound: { enabled: true, files: fireworkSounds, volume: { min: 30, max: 70 } },
        });
        setTimeout(() => fireworksRef.current?.start(), 500);
      }
    };

    window.addEventListener("load", initializeFireworks);
    initializeFireworks(); // Run if already loaded

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 4 && prev > 1) {
          playBeep(800); // Beep at 3, 2, 1
        }
        if (prev === 1) {
          playBeep(1200, "square"); // Higher pitch on 0
        }
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsFlashing(true);
          setTimeout(() => {
            capturePhoto();
            setIsFlashing(false);
          }, 150); // slight delay for flash effect
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      fireworksRef.current?.stop();
      window.removeEventListener("load", initializeFireworks);
    };
  }, []);

  const capturePhoto = () => {
    if (webcamRef.current) {
      // Force high resolution for the screenshot (4K) to ensure it looks crisp in the PDF
      const imageSrc = webcamRef.current.getScreenshot({ width: 3840, height: 2160 });
      if (imageSrc) {
        setCapturedImage(imageSrc);
        stopWebcamStream();
        triggerConfetti();
      } else {
        setTimeout(capturePhoto, 300);
      }
    }
  };

  const stopWebcamStream = () => {
    if (webcamRef.current && webcamRef.current.video) {
      const stream = webcamRef.current.video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
    setShowWebcam(false);
  };

  const handleDownloadClick = () => {
    setShowNameModal(true);
  };

  const confirmDownload = () => {
    setShowNameModal(false);
    if (inputName.trim() !== "") {
      setUserName(inputName);
    }
    setTimeout(generatePDF, 100);
  };

  const generatePDF = () => {
    if (!certificateRef.current) return;

    const node = certificateRef.current;
    const originalTransform = node.style.transform;
    node.style.transform = 'scale(1)'; // Temporarily remove scale so html2canvas renders full res

    html2canvas(node, { 
      scale: 3, // High quality
      useCORS: true,
      backgroundColor: "#fdfbf7",
      windowWidth: 800,
      windowHeight: 1131
    }).then((canvas) => {
      node.style.transform = originalTransform; // Restore scale
      
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      
      // Full edge-to-edge A4 dimensions
      const pdfWidth = 210;
      const pdfHeight = 297;

      // Draw the image filling the exact A4 bounds
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, "", "FAST");
      pdf.save("Zertifikat_Einreichung.pdf");
    }).catch(err => {
      node.style.transform = originalTransform;
      console.error("PDF generation error:", err);
    });
  };

  return (
    <div className="celebration-container">
      <div ref={fireworksContainerRef} className="fireworks-container"></div>
      
      {isFlashing && <div className="flash-overlay"></div>}

      {!capturedImage && (
        <>
          <h1 className="celebration-title">
            <span className="highlight-gold">Herzlichen Glückwunsch</span> zur Einreichung!
          </h1>
          {countdown > 0 ? (
            <div className="countdown-text">Foto in {countdown}...</div>
          ) : (
            <div className="countdown-text" style={{color: '#fff', borderColor: 'var(--accent-gold)'}}>Lächeln!</div>
          )}
        </>
      )}

      {showWebcam && (
        <div className="webcam-container">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/png"
            className="webcam"
            videoConstraints={videoConstraints}
            mirrored={true}
          />
          <div className="camera-overlay"></div>
          <div className="camera-overlay-corners"></div>
          <div className="crosshair"></div>
        </div>
      )}

      {capturedImage && (
        <div className="certificate-wrapper">
          <div 
            ref={certificateWrapperRef} 
            className="certificate-responsive-wrapper" 
            style={{ width: '100%', maxWidth: '800px', aspectRatio: '1 / 1.4142', position: 'relative', overflow: 'hidden', margin: '0 auto' }}
          >
            <div 
              ref={certificateRef} 
              className="certificate"
              style={{
                width: '800px',
                height: '1131.36px',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
                maxWidth: 'none',
                aspectRatio: 'auto'
              }}
            >
              <div className="certificate-inner">
                <div className="certificate-content">
                  <div className="cert-header-container">
                    <span className="trophy-icon">🎓</span>
                    <h2 className="cert-header">Ehrenvolles Zertifikat</h2>
                    <span className="trophy-icon">🎓</span>
                  </div>
                  
                  <div className="cert-awarded-to">Verliehen an:</div>
                  
                  {/* Only show the cursive name if one was entered, otherwise keep it blank or as a placeholder */}
                  {userName && userName !== "Mega-Brain der Wissenschaft" && (
                     <div className="cert-name">{userName}</div>
                  )}
                  
                  <div className="cert-name-fixed">Mega-Brain der Wissenschaft</div>
                  
                  <div className="cert-reason">
                    Für die erfolgreiche Einreichung der Dissertation
                  </div>

                  <div className="cert-photo-container">
                    <img src={capturedImage} alt="Zertifikatsfoto" className="cert-photo" />
                  </div>

                  <div className="cert-footer">
                    <div className="cert-seal"></div>
                    <div className="cert-signature">
                      <p>Verliehen vom <strong>Lehrstuhl für Eskalation (LfE)</strong></p>
                      <p>Ihr Einreichungskomitee Kippo und Lorenzo wünscht alles Gute!</p>
                    </div>
                  </div>
                  
                  <div className="cert-date-bottom">
                    München, den {new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="btn-download-container">
            <button className="btn-download" onClick={handleDownloadClick}>
              📄 Zertifikat herunterladen
            </button>
          </div>
        </div>
      )}

      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Wie lautet dein Name?</h3>
            <p>Dieser Name wird elegant auf dein Zertifikat gedruckt.</p>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Dein Name..." 
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') confirmDownload(); }}
              autoFocus
            />
            <button className="btn-download" style={{width: '100%', justifyContent: 'center'}} onClick={confirmDownload}>
              PDF generieren
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CelebrationApp;

