import SharedAttemptFrame from '../../test-attempts/components/SharedAttemptFrame.jsx';
import AttemptProviderSwitch from '../../test-attempts/components/AttemptProviderSwitch.jsx';

export default function GrammarAttemptLayout() {
  return (
    <AttemptProviderSwitch expectedComponent="GRAMMAR_VOCAB">
      <SharedAttemptFrame resultPath="/grammar-vocab/result" testPathPrefix="/grammar-vocab/test/" />
    </AttemptProviderSwitch>
  );
}
