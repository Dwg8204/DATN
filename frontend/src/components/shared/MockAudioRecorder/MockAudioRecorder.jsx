import React from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import styles from './MockAudioRecorder.module.css';
import cameraImg from '../../../features/module-speaking/assets/OIP.webp';

export default function MockAudioRecorder({ isRecording, isFinished, timeLeft, maxTime, onStartRecord, onStopRecord, countdownBeforeStart = 0 }) {
  return (
    <div className={styles.recorderContainer}>
      {/* Camera simulation */}
      <div className={styles.cameraWrapper}>
        <img src={cameraImg} alt="Camera simulation" className={styles.cameraImg} />
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
