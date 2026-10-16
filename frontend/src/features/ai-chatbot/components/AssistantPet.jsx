import styles from './AssistantPet.module.css';

/** Small SVG mascot: no image download, canvas loop or animation dependency. */
export default function AssistantPet({label}) {
  return <span className={styles.pet} aria-hidden="true">
    <span className={styles.hint}>{label}</span>
    <svg className={styles.figure} viewBox="0 0 120 128" fill="none" focusable="false">
      <ellipse className={styles.shadow} cx="60" cy="119" rx="29" ry="5" fill="#6F0F12" fillOpacity=".17"/>
      <g className={styles.body}>
        <path d="M37 100L33 111C32 115 42 117 48 113L51 104M69 104L72 113C78 117 88 115 87 111L83 100" fill="#B51E32"/>
        <path d="M31 79C25 78 18 86 19 92C20 98 27 99 33 91" fill="#FFCDD5" stroke="#B51E32" strokeWidth="2.5"/>
        <g className={styles.hand}>
          <path d="M88 80C98 77 101 66 100 60C100 56 105 55 107 60C113 73 105 91 91 94" fill="#FFCDD5" stroke="#B51E32" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M102 64L106 64" stroke="#B51E32" strokeWidth="2" strokeLinecap="round"/>
        </g>
        <path d="M35 72C38 65 82 65 85 72L91 96C94 116 26 116 29 96L35 72Z" fill="#DA1E21" stroke="#B51E32" strokeWidth="2.5"/>
        <path d="M47 86C47 81 73 81 73 86V97C73 105 47 105 47 97V86Z" fill="#FFF4EE"/>
        <path d="M54 96L60 85L66 96M56 93H64" stroke="#DA1E21" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <g className={styles.head}>
          <path d="M60 25V15" stroke="#B51E32" strokeWidth="3" strokeLinecap="round"/>
          <circle className={styles.beacon} cx="60" cy="11" r="6" fill="#FFB94E" stroke="#B51E32" strokeWidth="2"/>
          <rect x="13" y="43" width="13" height="23" rx="6.5" fill="#DA1E21"/>
          <rect x="94" y="43" width="13" height="23" rx="6.5" fill="#DA1E21"/>
          <rect x="22" y="26" width="76" height="56" rx="24" fill="#FFF8F2" stroke="#B51E32" strokeWidth="2.5"/>
          <path d="M34 36C40 30 47 30 51 30" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          <rect x="30" y="38" width="60" height="33" rx="15" fill="#302435"/>
          <g className={styles.eyes} fill="#FFF8F2">
            <rect x="41" y="46" width="7" height="13" rx="3.5"/>
            <rect x="72" y="46" width="7" height="13" rx="3.5"/>
          </g>
          <path d="M55 60Q60 65 65 60" stroke="#FFF8F2" strokeWidth="2.5" strokeLinecap="round"/>
          <ellipse cx="37" cy="62" rx="4" ry="2" fill="#FF94AB"/>
          <ellipse cx="83" cy="62" rx="4" ry="2" fill="#FF94AB"/>
        </g>
      </g>
      <path className={styles.spark} d="M17 24V34M12 29H22" stroke="#E59A2B" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  </span>;
}
