import SharedAttemptFrame from '../../test-attempts/components/SharedAttemptFrame.jsx';
import AttemptProviderSwitch from '../../test-attempts/components/AttemptProviderSwitch.jsx';

export default function ListeningAttemptLayout() {
  return (
    <AttemptProviderSwitch expectedComponent="LISTENING">
      <SharedAttemptFrame resultPath="/listening/result" testPathPrefix="/listening/test/" />
    </AttemptProviderSwitch>
  );
}
