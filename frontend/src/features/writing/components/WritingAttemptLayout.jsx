import RoleGuard from '../../auth/components/RoleGuard.jsx';
import SharedAttemptFrame from '../../test-attempts/components/SharedAttemptFrame.jsx';
import AttemptProviderSwitch from '../../test-attempts/components/AttemptProviderSwitch.jsx';

export default function WritingAttemptLayout() {
  return <RoleGuard allowedRoles={['STUDENT']}>
    <AttemptProviderSwitch expectedComponent="WRITING">
      <SharedAttemptFrame resultPath="/writing/result" testPathPrefix="/writing/test/" />
    </AttemptProviderSwitch>
  </RoleGuard>;
}
