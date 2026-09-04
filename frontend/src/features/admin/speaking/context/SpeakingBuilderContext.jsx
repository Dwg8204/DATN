import { createContext, useContext, useMemo, useReducer } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { createSpeakingDraft } from '../data/speakingTestModel';
import { getStoredSpeakingTest } from '../data/speakingTestStorage';
const Context=createContext(null);
const reducer=(state,action)=>action.type==='details'?{...state,details:{...state.details,[action.field]:action.value}}:action.type==='part'?{...state,parts:{...state.parts,[action.number]:action.value}}:state;
export const useSpeakingBuilder=()=>{const value=useContext(Context);if(!value)throw new Error('useSpeakingBuilder must be used inside SpeakingBuilderLayout');return value};
export default function SpeakingBuilderLayout(){const{testId}=useParams();const[params]=useSearchParams();const requested=params.get('mode');const mode=['part1','part2','part3','part4','full'].includes(requested)?requested:'full';const[test,dispatch]=useReducer(reducer,undefined,()=>testId?getStoredSpeakingTest(testId):createSpeakingDraft(mode));const basePath=testId?`/admin/tests/speaking/${testId}/edit`:'/admin/tests/new/speaking';const value=useMemo(()=>({test,basePath,updateDetails:(field,next)=>dispatch({type:'details',field,value:next}),updatePart:(number,next)=>dispatch({type:'part',number,value:next})}),[test,basePath]);if(!test)return<p>Test not found. Return to Test Management.</p>;return <Context.Provider value={value}><Outlet/></Context.Provider>}
