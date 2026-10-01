import { useSearchParams } from 'react-router-dom';
import { TestAttemptProvider } from '../context/TestAttemptContext.jsx';
import { PracticeAttemptProvider } from '../context/PracticeAttemptContext.jsx';

export default function AttemptProviderSwitch({ expectedComponent, children }) {
  const [params] = useSearchParams();
  return params.get('practice') === 'true'
    ? <PracticeAttemptProvider expectedComponent={expectedComponent}>{children}</PracticeAttemptProvider>
    : <TestAttemptProvider expectedComponent={expectedComponent}>{children}</TestAttemptProvider>;
}
