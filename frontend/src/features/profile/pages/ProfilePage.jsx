import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { useAuth } from '../../../context/AuthContext';
import { Key, Plus } from 'lucide-react';
import ConfirmModal from '../../../components/common/ConfirmModal';
import ToastNotification from '../../../components/common/ToastNotification';
import { calcGoalProgress } from '../../../utils/dashboardUtils';
import { getHistoryEntries } from '../../../utils/historyStorage';
import { addPersonalNotification } from '../../../utils/notificationStorage';
import { profileApi } from '../services/profileApi';
import styles from './ProfilePage.module.css';
import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Goal config
  const [goalConfig, setGoalConfig] = useState(() => {
    const saved = localStorage.getItem('aptimate.dashboard_goal');
    return saved ? JSON.parse(saved) : { active: false, startDate: new Date().toISOString(), durationDays: 30, targetTests: 47, targetBand: 'B2' };
  });

  const [tempGoalBand, setTempGoalBand] = useState(goalConfig.targetBand || 'B2');
  const [tempGoalTests, setTempGoalTests] = useState(goalConfig.targetTests || 47);
  const [tempGoalDays, setTempGoalDays] = useState(goalConfig.durationDays || 30);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const historyEntries = getHistoryEntries();
  const goalProgress = goalConfig.active ? calcGoalProgress(goalConfig, historyEntries) : null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const executeSave = async () => {
    setIsSaving(true);
    setShowConfirm(false);
    
    // Validate empty names
    if (!firstName.trim()) {
      setToastType('error');
      setToastMessage(t('account.firstNameRequired'));
      setFirstName(user?.firstName || '');
      setIsSaving(false);
      return;
    }
    if (!lastName.trim()) {
      setToastType('error');
      setToastMessage(t('account.lastNameRequired'));
      setLastName(user?.lastName || '');
      setIsSaving(false);
      return;
    }

    try {
      const updates = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio,
        phone
      };
      
      await profileApi.updateProfile(updates);

      if (avatarFile) {
        await profileApi.uploadAvatar(avatarFile);
      }

      // Fetch the latest profile to ensure 100% sync with sidebar and header
      const freshProfile = await profileApi.getProfile();
      updateProfile(freshProfile);

      setToastType('success');
      setToastMessage(t('account.saved'));
      addPersonalNotification(t('account.saved'));
    } catch (error) {
      console.error('Failed to save profile', error);
      setToastType('error');
      setToastMessage(error.response?.data?.message || t('account.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoal = () => {
    const newConfig = {
      active: true,
      startDate: goalConfig.active ? goalConfig.startDate : new Date().toISOString(),
      durationDays: Number(tempGoalDays),
      targetTests: Number(tempGoalTests),
      targetBand: tempGoalBand
    };
    setGoalConfig(newConfig);
    localStorage.setItem('aptimate.dashboard_goal', JSON.stringify(newConfig));
    setShowGoalForm(false);
    setToastMessage(t('goal.saved'));
    addPersonalNotification(t('goal.saved'));
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="info" />
        
        <div className={styles.content}>
          <div className={styles.avatarSection}>
            <img src={avatarBase64 || user?.avatar?.url || user?.avatar || 'https://placehold.co/100x100'} alt="Large Avatar" className={styles.largeAvatar} />
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
              <Plus size={20} />
            </button>
          </div>
          
          <form className={styles.form} onSubmit={handleFormSubmit}>
            <div className={styles.inputRow}>
              <div className={styles.inputCol}>
                <label className={styles.label}>{t('account.firstName')}</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)} 
                />
              </div>
              <div className={styles.inputCol}>
                <label className={styles.label}>{t('account.lastName')}</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                />
              </div>
            </div>
            
            <div className={styles.inputCol}>
              <label className={styles.label}>{t('account.bio')}</label>
              <textarea 
                className={styles.textarea} 
                rows="4" 
                value={bio} 
                onChange={e => setBio(e.target.value)}
              />
            </div>
            
            <div className={styles.inputCol}>
              <label className={styles.label}>{t('account.phone')}</label>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="(+84)" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            
            <div className={styles.actions}>
              <button 
                type="button" 
                className={styles.changePasswordBtn}
                onClick={() => navigate('/profile/change-password')}
              >
                <Key size={16} style={{ marginRight: '8px' }} />
                {t('account.changePassword')}
              </button>
              
              <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                {t(isSaving ? 'account.saving' : 'account.saveChanges')}
              </button>
            </div>
            
            <div className={`${styles.mobileGoalSummary} ${styles.desktopHidden}`}>
              {goalConfig.active && goalProgress && (
                <div className={styles.mobileGoalGrid}>
                  <div className={styles.goalTile}>
                    <div className={styles.goalTileTitle}>{t('goal.target')}</div>
                    <div className={styles.goalTileValuePrimary}>{t('dashboard.band', { band: goalConfig.targetBand })}</div>
                  </div>
                  <div className={styles.goalTile}>
                    <div className={styles.goalTileTitle}>{t('goal.current')}</div>
                    <div className={styles.goalTileValue}>{t('dashboard.band', { band: goalProgress.currentEstBand })}</div>
                  </div>
                  <div className={styles.goalTile}>
                    <div className={styles.goalTileTitle}>{t('goal.completed')}</div>
                    <div className={styles.goalTileValue}>
                      {goalProgress.completedTests} <span className={styles.goalTileUnit}>{t('goal.tests')}</span>
                    </div>
                  </div>
                  <div className={styles.goalTile}>
                    <div className={styles.goalTileTitle}>{t('goal.learningTime')}</div>
                    <div className={styles.goalTileValue}>
                      {goalProgress.totalHours} <span className={styles.goalTileUnit}>{t('goal.hours')}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                type="button" 
                className={styles.mobileSetGoalBtn}
                onClick={() => setShowGoalForm(!showGoalForm)}
              >
                {t(goalConfig.active ? 'goal.change' : 'goal.set')}
              </button>
            </div>

            <div className={`${styles.goalTrackerContainer} ${!showGoalForm ? styles.mobileHiddenForm : ''}`}>
              <div className={styles.sectionDivider}></div>
              <h3 className={styles.sectionTitle}>{t('goal.tracker')}</h3>
              
              <div className={styles.goalSettings}>
              <div className={styles.goalInputGroup}>
                <label className={styles.label}>{t('goal.targetBand')}</label>
                <select className={styles.input} value={tempGoalBand} onChange={e => setTempGoalBand(e.target.value)}>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div className={styles.goalInputGroup}>
                <label className={styles.label}>{t('goal.totalTests')}</label>
                <input type="number" min="1" className={styles.input} value={tempGoalTests} onChange={e => setTempGoalTests(e.target.value)} />
              </div>
              <div className={styles.goalInputGroup}>
                <label className={styles.label}>{t('goal.duration')}</label>
                <input type="number" min="1" className={styles.input} value={tempGoalDays} onChange={e => setTempGoalDays(e.target.value)} />
              </div>
            </div>

            <div className={styles.actions} style={{ marginTop: '16px', marginBottom: '32px', justifyContent: 'flex-end' }}>
              <button type="button" className={styles.saveBtn} onClick={handleSaveGoal}>
                {t('goal.save')}
              </button>
            </div>
            </div>
          </form>

          {showConfirm && (
            <ConfirmModal 
              title={t('account.saveTitle')}
              message={t('account.saveConfirm')}
              onConfirm={executeSave}
              onCancel={() => setShowConfirm(false)}
            />
          )}

          {isSaving && (
            <div className={styles.modalOverlay}>
              <div className={styles.loadingModal}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>{t('account.aligning')}</p>
              </div>
            </div>
          )}

          <ToastNotification 
            message={toastMessage} 
            type={toastType}
            onClose={() => setToastMessage('')} 
          />
        </div>
      </div>
    </div>
  );
}
