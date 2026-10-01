import RoleGuard from '../../auth/components/RoleGuard.jsx';
import SharedAttemptFrame from '../../test-attempts/components/SharedAttemptFrame.jsx';
import AttemptProviderSwitch from '../../test-attempts/components/AttemptProviderSwitch.jsx';

export default function ListeningAttemptLayout() {
  return (
    <RoleGuard allowedRoles={['STUDENT']}>
      <AttemptProviderSwitch expectedComponent="LISTENING">
        <SharedAttemptFrame resultPath="/listening/result" testPathPrefix="/listening/test/" />
      </AttemptProviderSwitch>
    </RoleGuard>
  );
}
