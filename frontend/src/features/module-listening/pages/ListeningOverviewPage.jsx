import SkillResources, { SkillSource } from '../../../components/common/SkillResources.jsx';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useNavigate } from 'react-router-dom';
import styles from './ListeningOverviewPage.module.css';


export default function ListeningOverviewPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>{ui("Listening")}</span>{ ' ' + ui("Overview") }</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>{ ui("A quick look at the") + ' ' }</span>
            <span className={styles.headingLight}>{ui("Aptis Listening")}</span>
            <span className={styles.headingBold}>{ ' ' + ui("Test") }</span>
          </div>
          <div className={styles.textBlock}>
            <p>{ui("Duration: approximately 40 minutes")}</p>
            <p>{ui("The Listening test is relevant for both Aptis and Aptis ESOL. You will need to complete 17 tasks with a total of 20 questions in response to multiple recordings focusing on different aspects of real-life listening.")}</p>
            <p>{ui("You will listen to a variety of recordings including short messages, dialogues, short monologues and longer monologues. You can hear each recording twice.")}<br />{ui("These questions test your ability to:")}<br />{ui("- Identify specific information from short messages or dialogues")}<br />{ui("- Match speakers to pieces of information on a common topic")}<br />{ui("- Identify who expresses which opinion in a discussion")}<br />{ui("- Identify a speaker's opinion or point of view in longer monologues")}</p>
          </div>
        </div>

        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>{ui("Listening part details:")}</div>
          <div className={styles.textBlock}>{ui("Part 1 — Information recognition: You will listen to a short message or a dialogue and need to identify specific information such as a phone number, a time or a place.")}<br />{ui("Part 2 — Information matching: You will listen to short monologues on a common topic by four different people. You will be asked to match each speaker to a piece of information.")}<br />{ui("Part 3 — Inference (discussion): You will listen to a man and a woman discuss a topic and express certain opinions. You will be asked to identify who expresses which opinion.")}<br />{ui("Part 4 — Inference (longer monologues): You will listen to two longer monologues on different topics. You will be asked to identify the speaker's opinion or point of view on two aspects of each topic.")}</div>
        </div>
      </div>

      <SkillSource skill="listening" />
      <SkillResources skill="listening" />

      <button className={styles.goToTestBtn} onClick={() => navigate('/listening/tests')}>{ui("View Test List")}</button>
    </div>
  );
}
