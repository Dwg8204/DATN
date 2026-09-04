import { useState } from 'react';
import { useLocation,useNavigate,useParams } from 'react-router-dom';
import { AdminToast } from '../components/AdminFeedback';
import { getStoredListeningTest } from './data/listeningTestStorage';
import { LISTENING_PARTS } from './data/listeningTestModel';
import ListeningAnswerPreview from './ListeningAnswerPreview';
import styles from '../reading/components/ReadingEditor.module.css';
export default function ListeningTestPreviewPage(){const{testId}=useParams();const navigate=useNavigate();const location=useLocation();const[test]=useState(()=>getStoredListeningTest(testId));const parts=LISTENING_PARTS.filter(part=>test&&(test.mode==='full'||test.mode===`part${part.number}`));const[activePart,setActivePart]=useState(parts[0]?.number||1);if(!test)return<p>Test not found.</p>;return <main className={styles.page}><AdminToast message={location.state?.toast} onClose={()=>navigate(location.pathname,{replace:true,state:{}})}/><div className={styles.actions}><button onClick={()=>navigate('/admin/tests')}>Back to Test Management</button><button onClick={()=>navigate(`/admin/tests/listening/${test.id}/edit`)}>Edit test</button></div><header className={styles.summary}><h2>{test.title}</h2><p>Listening · Answer preview · Correct answers are highlighted in green.</p></header><nav className={styles.previewTabs}>{parts.map(part=><button aria-pressed={activePart===part.number} key={part.number} onClick={()=>setActivePart(part.number)}>Part {part.number} · {part.title}</button>)}</nav><ListeningAnswerPreview test={test} part={activePart}/></main>}
