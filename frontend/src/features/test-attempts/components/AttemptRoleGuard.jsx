import { useSearchParams } from 'react-router-dom';
import RoleGuard from '../../auth/components/RoleGuard.jsx';

// Mirror the backend's exam/practice role policy. The API still validates
// attempt purpose and ownership; a query parameter never grants API access.
export default function AttemptRoleGuard({ children }) {
  const [params] = useSearchParams();
  const allowedRoles = params.get('practice') === 'true'
    ? ['STUDENT', 'TEACHER', 'ADMIN'] : ['STUDENT'];
  return <RoleGuard allowedRoles={allowedRoles}>{children}</RoleGuard>;
}
