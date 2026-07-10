import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const footerLinks = ['About us', 'Privacy Policy', 'Terms of use', 'Disclaimer'];
const contactItems = ['Hotline', 'Email', 'Facebook', 'Location'];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLeft}>
        <div className={styles.brandCol}>
          <Link to="/">
            <img
              src="https://res.cloudinary.com/dkrisyrlh/image/upload/v1783651299/logo_t%C3%A1ch_n%E1%BB%81n_wisae6.png"
              alt="AptiMate Logo"
              className={styles.footerLogo}
            />
          </Link>
          <div className={styles.linkList}>
            {footerLinks.map((link) => (
              <button key={link} className={styles.linkItem}>
                {link}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.contactCol}>
          <span className={styles.contactTitle}>CONTACT</span>
          <div className={styles.contactList}>
            {contactItems.map((item) => (
              <span key={item} className={styles.contactItem}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footerRight}>
        <button className={styles.feedbackBtn}>
          <span className={styles.feedbackBtnText}>Leave us feedback</span>
        </button>
        <span className={styles.copyright}>
          Copyright ©2026 AptisMate, Inc. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
