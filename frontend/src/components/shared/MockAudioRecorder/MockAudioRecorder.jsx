import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Camera, CameraOff } from 'lucide-react';
import styles from './MockAudioRecorder.module.css';
import cameraImg from '../../../features/module-speaking/assets/OIP.webp';

export default function MockAudioRecorder({ isRecording, isFinished, timeLeft, maxTime, onStartRecord, onStopRecord, countdownBeforeStart = 0 }) {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('pending'); // 'pending', 'granted', 'denied'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPermission('granted');
      setCameraOn(true);
    } catch (err) {
      console.error("Camera access denied or error:", err);
      setCameraPermission('denied');
      setCameraOn(false);
    }
  };

  const toggleCamera = () => {
    if (cameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  useEffect(() => {
    // Start camera on mount
    startCamera();

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

  // Assign stream to video element when it mounts (cameraOn becomes true)
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);
  return (
    <div className={styles.recorderContainer}>
      {/* Camera simulation / Real Camera */}
      <div className={styles.cameraWrapper}>
        {cameraOn ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className={styles.cameraVideo} 
          />
        ) : (
          <div className={styles.cameraOff}>
            Camera đang tắt
          </div>
        )}
        
        <button 
          className={`${styles.cameraToggleBtn} ${!cameraOn ? styles.cameraToggleBtnOff : ''}`}
          onClick={toggleCamera}
          title={cameraOn ? "Tắt Camera" : "Bật Camera"}
        >
          {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
        </button>

        {isRecording && (
          <div className={styles.recIndicator}>
            <div className={styles.recDot}></div>
            <span className={styles.recText}>REC</span>
          </div>
        )}
      </div>

      {/* Sound wave (only while recording) */}
      {isRecording && (
        <div className={styles.soundWaveRow}>
          <Mic className={styles.micActive} size={20} />
          <div className={styles.soundWave}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className={styles.bar} style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
          </div>
          <span className={styles.recordingText}>Recording...</span>
        </div>
      )}

      {!isRecording && !isFinished && (
        <div className={styles.idleRow}>
          <MicOff size={20} className={styles.micInactive} />
          <span className={styles.idleText}>Press the button to start recording</span>
        </div>
      )}

      {isFinished && (
        <div className={styles.finishedRow}>
          <span className={styles.finishedText}>✓ Recording complete</span>
        </div>
      )}

      {/* Timer */}
      <div className={styles.timerDisplay}>
        <span className={isRecording ? styles.timeTextActive : styles.timeText}>
          00:{timeLeft.toString().padStart(2, '0')}
        </span>
        <span className={styles.maxTimeText}> / 00:{maxTime.toString().padStart(2, '0')}</span>
      </div>

      {/* Record / Stop button */}
      <div className={styles.buttonArea}>
        {!isRecording && !isFinished && (
          countdownBeforeStart > 0 ? (
            <div className={styles.countdownOverlay}>
              <span className={styles.countdownNumber}>{countdownBeforeStart}</span>
            </div>
          ) : (
            <button className={styles.recordBtn} onClick={onStartRecord} title="Start record">
              <span className={styles.recordBtnInner}></span>
            </button>
          )
        )}
        {isRecording && (
          <button className={styles.stopBtn} onClick={onStopRecord} title="Stop record">
            <Square size={20} fill="white" color="white" />
          </button>
        )}
        <span className={styles.btnLabel}>
          {isRecording ? 'Stop record' : isFinished ? '' : 'Start record'}
        </span>
      </div>
    </div>
  );
}
