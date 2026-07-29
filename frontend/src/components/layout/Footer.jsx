import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const footerLinks = [
  { label: 'About us', to: '/#about-us' },
  { label: 'Privacy Policy', to: '/#privacy-policy' },
  { label: 'Terms of use', to: '/#terms-of-use' },
  { label: 'Disclaimer', to: '/#disclaimer' },
];

const contactItems = [
  { label: 'Hotline', value: '(+84) 123 456 789', href: 'tel:+84123456789' },
  { label: 'Email', value: 'support@aptimate.com', href: 'mailto:support@aptimate.com' },
  { label: 'Facebook', value: 'AptiMate Learning', href: 'https://www.facebook.com/' },
  { label: 'Location', value: 'Ho Chi Minh City, Vietnam' },
];

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
          <p className={styles.brandDescription}>
            Online Aptis preparation with realistic practice tests, instant results, and detailed answer reviews.
          </p>
          <div className={styles.linkList}>
            {footerLinks.map((link) => (
              <Link key={link.label} to={link.to} className={styles.linkItem}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.contactCol}>
          <span className={styles.contactTitle}>CONTACT</span>
          <div className={styles.contactList}>
            {contactItems.map((item) => {
              const content = (
                <>
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </>
              );

              return item.href ? (
                <a key={item.label} className={styles.contactItem} href={item.href}>
                  {content}
                </a>
              ) : (
                <div key={item.label} className={styles.contactItem}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.footerRight}>
        <a className={styles.feedbackBtn} href="mailto:support@aptimate.com?subject=AptiMate%20feedback">
          <span className={styles.feedbackBtnText}>Leave us feedback</span>
        </a>
        <span className={styles.copyright}>
          Copyright ©2026 AptiMate. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
