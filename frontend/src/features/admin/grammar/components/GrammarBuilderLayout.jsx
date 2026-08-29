import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { GrammarTestBuilderProvider } from '../context/GrammarTestBuilderContext';
import { createGrammarTestDraft } from '../data/grammarTestData';
import { getStoredGrammarTest } from '../data/grammarTestStorage';
export default function GrammarBuilderLayout(){const{testId}=useParams();const[params]=useSearchParams();const mode=['part1','part2','full'].includes(params.get('mode'))?params.get('mode'):'full';const existing=testId?getStoredGrammarTest(testId):null;const basePath=existing?`/admin/tests/grammar/${testId}/edit`:'/admin/tests/new/grammar';return <GrammarTestBuilderProvider initialTest={existing||createGrammarTestDraft(mode)} basePath={basePath}><Outlet/></GrammarTestBuilderProvider>}
