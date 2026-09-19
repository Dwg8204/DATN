import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { createListeningDraft } from '../data/listeningTestModel';
import { listeningTestsApi } from '../services/listeningTestsApi';

const Context = createContext(null);

const reducer = (state, action) => {
  if (action.type === 'details') return { ...state, details: { ...state.details, [action.field]: action.value } };
  if (action.type === 'part') return { ...state, parts: { ...state.parts, [action.number]: action.value } };
  if (action.type === 'init') return action.payload;
  return state;
};

export const useListeningBuilder = () => {
  const value = useContext(Context);
  if (!value) throw new Error('useListeningBuilder must be used inside ListeningBuilderLayout');
  return value;
};

export default function ListeningBuilderLayout() {
  const { testId } = useParams();
  const [params] = useSearchParams();
  const mode = ['part1', 'part2', 'part3', 'part4'].includes(params.get('mode')) ? params.get('mode') : 'full';
  
  const [test, dispatch] = useReducer(reducer, null);
  const [loading, setLoading] = useState(!!testId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!testId) {
      dispatch({ type: 'init', payload: createListeningDraft(mode) });
      return;
    }
    const controller = new AbortController();
    listeningTestsApi.getAdmin(testId, controller.signal)
      .then(data => {
        dispatch({ type: 'init', payload: data });
        setLoading(false);
      })
      .catch(err => {
        if (err.code !== 'ERR_CANCELED') {
          setError('Test not found or unable to load.');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [testId, mode]);

  const basePath = testId ? `/admin/tests/listening/${testId}/edit` : '/admin/tests/new/listening';
  
  const value = useMemo(() => ({
    test,
    basePath,
    updateDetails: (field, value) => dispatch({ type: 'details', field, value }),
    updatePart: (number, value) => dispatch({ type: 'part', number, value }),
  }), [test, basePath]);

  if (loading) return <p>Loading test...</p>;
  if (error || !test) return <p>{error || 'Test not found. Return to Test Management.'}</p>;

  return <Context.Provider value={value}><Outlet /></Context.Provider>;
}
