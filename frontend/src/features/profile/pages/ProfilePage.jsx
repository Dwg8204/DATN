import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { useAuth } from '../../../context/AuthContext';
import { Key, Plus, Target } from 'lucide-react';
import ConfirmModal from '../../../components/common/ConfirmModal';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [firstName, setFirstName] = useState(user?.name ? user.name.split(' ')[0] : '');
  const [lastName, setLastName] = useState(user?.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(1).join(' ') : '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarBase64, setAvatarBase64] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);

  // Goal config
  const [goalConfig, setGoalConfig] = useState(() => {
    const saved = localStorage.getItem('aptimate.dashboard_goal');
    return saved ? JSON.parse(saved) : { active: false, startDate: new Date().toISOString(), durationDays: 30, targetTests: 47, targetBand: 'B2' };
  });

  const [tempGoalBand, setTempGoalBand] = useState(goalConfig.targetBand || 'B2');
  const [tempGoalTests, setTempGoalTests] = useState(goalConfig.targetTests || 47);
  const [tempGoalDays, setTempGoalDays] = useState(goalConfig.durationDays || 30);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  const executeSave = () => {
    const updates = {
      name: `${firstName} ${lastName}`.trim(),
      bio,
      phone
    };
    if (avatarBase64) {
      updates.avatar = avatarBase64;
    }
    updateProfile(updates);

    setShowConfirm(false);
    alert('Personal information saved successfully!');
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
    alert('Learning goal saved successfully!');
  };

  const handleDeactivateGoal = () => {
    const newConfig = { ...goalConfig, active: false };
    setGoalConfig(newConfig);
    localStorage.setItem('aptimate.dashboard_goal', JSON.stringify(newConfig));
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProfileSidebar activeTab="info" />
        
        <div className={styles.content}>
          <div className={styles.avatarSection}>
            <img src={avatarBase64 || user?.avatar || 'https://placehold.co/100x100'} alt="Large Avatar" className={styles.largeAvatar} />
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
                <label className={styles.label}>First Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)} 
                />
              </div>
              <div className={styles.inputCol}>
                <label className={styles.label}>Last Name</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                />
              </div>
            </div>
            
            <div className={styles.inputCol}>
              <label className={styles.label}>Bio</label>
              <textarea 
                className={styles.textarea} 
                rows="4" 
                value={bio} 
                onChange={e => setBio(e.target.value)}
              />
            </div>
            
            <div className={styles.inputCol}>
              <label className={styles.label}>Phone Number</label>
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
                Change password
              </button>
              
              <button type="submit" className={styles.saveBtn}>
                Save changes
              </button>
            </div>
            
            <div className={styles.sectionDivider}></div>
            <h3 className={styles.sectionTitle}>Learning Goal Tracker</h3>
            
            <div className={styles.goalSettings}>
              <div className={styles.goalInputGroup}>
                <label className={styles.label}>Target Band</label>
                <select className={styles.input} value={tempGoalBand} onChange={e => setTempGoalBand(e.target.value)}>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div className={styles.goalInputGroup}>
                <label className={styles.label}>Total Tests</label>
                <input type="number" min="1" className={styles.input} value={tempGoalTests} onChange={e => setTempGoalTests(e.target.value)} />
              </div>
              <div className={styles.goalInputGroup}>
                <label className={styles.label}>Duration (Days)</label>
                <input type="number" min="1" className={styles.input} value={tempGoalDays} onChange={e => setTempGoalDays(e.target.value)} />
              </div>
            </div>

            <div className={styles.actions} style={{ marginTop: '16px', marginBottom: '32px' }}>
              <button 
                type="button" 
                className={styles.changePasswordBtn} 
                onClick={handleDeactivateGoal}
              >
                <Target size={16} style={{ marginRight: '8px' }} />
                Change Goal
              </button>
              
              <button type="button" className={styles.saveBtn} onClick={handleSaveGoal}>
                Save Goal
              </button>
            </div>
          </form>

          {showConfirm && (
            <ConfirmModal 
              title="Save Changes"
              message="Are you sure you want to save these changes to your personal information?"
              onConfirm={executeSave}
              onCancel={() => setShowConfirm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
