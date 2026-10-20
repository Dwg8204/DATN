import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { useAuth } from '../../../context/AuthContext';
import { Key, Plus } from 'lucide-react';
import ConfirmModal from '../../../components/common/ConfirmModal';
import ToastNotification from '../../../components/common/ToastNotification';
import { addPersonalNotification } from '../../../utils/notificationStorage';
import { profileApi } from '../services/profileApi';
import styles from './ProfilePage.module.css';
import LearningGoalSettings from '../../personalization/components/LearningGoalSettings';
import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  const ui = useUiTranslation();
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="info" />

        <div className={styles.content}>
          <div className={styles.avatarSection}>
            <img src={avatarBase64 || user?.avatar?.url || user?.avatar || 'https://placehold.co/100x100'} alt={ui("Large Avatar")} className={styles.largeAvatar} />
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

          </form>
          {user?.role === 'STUDENT' && <LearningGoalSettings key={user.id} />}

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
