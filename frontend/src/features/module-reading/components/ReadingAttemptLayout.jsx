import AttemptProviderSwitch from '../../test-attempts/components/AttemptProviderSwitch.jsx';
import SharedAttemptFrame from '../../test-attempts/components/SharedAttemptFrame.jsx';

export default function ReadingAttemptLayout() {
  return <AttemptProviderSwitch expectedComponent="READING">
    <SharedAttemptFrame resultPath="/reading/result" testPathPrefix="/reading/test/" />
  </AttemptProviderSwitch>;
}
