import AttemptProviderSwitch from '../../test-attempts/components/AttemptProviderSwitch.jsx';
import SharedAttemptFrame from '../../test-attempts/components/SharedAttemptFrame.jsx';

export default function SpeakingAttemptLayout() {
  return <AttemptProviderSwitch expectedComponent="SPEAKING">
    <SharedAttemptFrame resultPath="/speaking/result" testPathPrefix="/speaking/test/" />
  </AttemptProviderSwitch>;
}
