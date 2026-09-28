import { Link } from 'react-router-dom';
import styles from './Footer.module.css';
import { useTranslation } from 'react-i18next';

const footerLinks = [
  { key: 'about', to: '/#about-us' },
  { key: 'privacy', to: '/#privacy-policy' },
  { key: 'terms', to: '/#terms-of-use' },
  { key: 'disclaimer', to: '/#disclaimer' },
];

const contactItems = [
  { label: 'Hotline', value: '(+84) 123 456 789', href: 'tel:+84123456789' },
  { label: 'Email', value: 'support@aptimate.com', href: 'mailto:support@aptimate.com' },
  { label: 'Facebook', value: 'AptiMate Learning', href: 'https://www.facebook.com/' },
  { label: 'Location', value: 'Ho Chi Minh City, Vietnam' },
];

export default function Footer() {
  const { t } = useTranslation();
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
            {t('footer.description')}
          </p>
          <div className={styles.linkList}>
            {footerLinks.map((link) => (
              <Link key={link.key} to={link.to} className={styles.linkItem}>
                {t(`footer.${link.key}`)}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.contactCol}>
          <span className={styles.contactTitle}>{t('footer.contact')}</span>
          <div className={styles.contactList}>
            {contactItems.map((item) => {
              const content = (
                <>
                  <strong>{t(`footer.${item.label.toLowerCase()}`)}</strong>
                  <span>{item.label === 'Location' ? t('footer.locationValue') : item.value}</span>
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
          <span className={styles.feedbackBtnText}>{t('footer.feedback')}</span>
        </a>
        <span className={styles.copyright}>
          {t('footer.copyright')}
        </span>
      </div>
    </footer>
  );
}
