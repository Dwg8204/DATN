import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';
import { useAuth } from '../../../context/AuthContext';
import { Key, Plus } from 'lucide-react';
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

  const handleSave = (e) => {
    e.preventDefault();
    const updates = {
      name: `${firstName} ${lastName}`.trim(),
      bio,
      phone
    };
    if (avatarBase64) {
      updates.avatar = avatarBase64;
    }
    updateProfile(updates);
    alert('Changes saved successfully!');
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
          
          <form className={styles.form} onSubmit={handleSave}>
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
          </form>
        </div>
      </div>
    </div>
  );
}
