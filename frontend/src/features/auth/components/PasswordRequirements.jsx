import { useUiTranslation } from '../../../i18n/useUiTranslation.jsx';
import { PASSWORD_REQUIREMENTS } from '../utils/passwordValidation';
import styles from '../pages/Auth.module.css';
export default function PasswordRequirements({ id }) {
  const ui = useUiTranslation();
  return <p id={id} className={styles.passwordRequirements}>{ui(PASSWORD_REQUIREMENTS)}</p>;
}
