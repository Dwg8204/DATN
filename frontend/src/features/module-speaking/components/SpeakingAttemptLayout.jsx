import AttemptProviderSwitch from '../../test-attempts/components/AttemptProviderSwitch.jsx';
import SharedAttemptFrame from '../../test-attempts/components/SharedAttemptFrame.jsx';
import SpeakingAiConsentGate from './SpeakingAiConsentGate.jsx';

export default function SpeakingAttemptLayout() {
  return <AttemptProviderSwitch expectedComponent="SPEAKING">
    <SpeakingAiConsentGate><SharedAttemptFrame resultPath="/speaking/result" testPathPrefix="/speaking/test/" /></SpeakingAiConsentGate>
  </AttemptProviderSwitch>;
}
