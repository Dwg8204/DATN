
import PopularDocumentCard from '../../../components/shared/PopularDocumentCard/PopularDocumentCard';
import styles from './ListeningOverviewPage.module.css';

export default function ListeningOverviewPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <div className={styles.section}>
          <h2 className={styles.mainTitle}>LISTENING OVERVIEW</h2>
          <div className={styles.textContent}>
            <p>A quick look at the Aptis Listening test</p>
            <p>Duration: approximately 40 minutes</p>
            <p>
              The Listening test is relevant for both Aptis and Aptis ESOL. You will need to complete 17 tasks with a total of 20 questions in response to multiple recordings focusing on different aspects of real-life listening.
            </p>
            <p>
              You will listen to a variety of recordings including short messages, dialogues, short monologues and longer monologues. You can hear each recording twice.
              <br />These questions test your ability to:
              <br />- Identify specific information from short messages or dialogues
              <br />- Match speakers to pieces of information on a common topic
              <br />- Identify who expresses which opinion in a discussion
              <br />- Identify a speaker's opinion or point of view in longer monologues
            </p>
            <p>
              Listening part details:
              <br />Part 1 — Information recognition: You will listen to a short message or a dialogue and need to identify specific information such as a phone number, a time or a place.
              <br />Part 2 — Information matching: You will listen to short monologues on a common topic by four different people. You will be asked to match each speaker to a piece of information.
              <br />Part 3 — Inference (discussion): You will listen to a man and a woman discuss a topic and express certain opinions. You will be asked to identify who expresses which opinion.
              <br />Part 4 — Inference (longer monologues): You will listen to two longer monologues on different topics. You will be asked to identify the speaker's opinion or point of view on two aspects of each topic.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.mainTitle}>LISTENING DOCUMENTS</h2>
          <div className={styles.docLinks}>
            <a href="#" className={styles.docLink}>Some tips for taking the APTIS Listening test</a>
            <a href="#" className={styles.docLink}>APTIS Listening practice test</a>
            <a href="#" className={styles.docLink}>Question types in the APTIS Listening test</a>
            <a href="#" className={styles.docLink}>APTIS Listening band scores</a>
          </div>
        </div>

        <div className={styles.popularSection}>
          <h2 className={styles.mainTitle}>MOST POPULAR</h2>
          <div className={styles.cardsGrid}>
            <PopularDocumentCard 
              skillName="WRITING" 
              description="Explore the latest Aptis Writing samples, updated regularly."
            />
            <PopularDocumentCard 
              skillName="READING" 
              description="Explore the latest Aptis Reading samples, updated regularly."
            />
            <PopularDocumentCard 
              skillName="LISTENING" 
              description="Explore the latest Aptis Listening samples, updated regularly."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
