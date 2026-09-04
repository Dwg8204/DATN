import { createContext, useContext, useMemo, useReducer } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { createListeningDraft } from '../data/listeningTestModel';
import { getStoredListeningTest } from '../data/listeningTestStorage';
const Context=createContext(null);
const reducer=(state,action)=>action.type==='details'?{...state,details:{...state.details,[action.field]:action.value}}:action.type==='part'?{...state,parts:{...state.parts,[action.number]:action.value}}:state;
export const useListeningBuilder=()=>{const value=useContext(Context);if(!value)throw new Error('useListeningBuilder must be used inside ListeningBuilderLayout');return value};
export default function ListeningBuilderLayout(){const{testId}=useParams();const[params]=useSearchParams();const mode=['part1','part2','part3','part4'].includes(params.get('mode'))?params.get('mode'):'full';const initial=testId?getStoredListeningTest(testId):createListeningDraft(mode);const[test,dispatch]=useReducer(reducer,initial);const basePath=testId?`/admin/tests/listening/${testId}/edit`:'/admin/tests/new/listening';const value=useMemo(()=>({test,basePath,updateDetails:(field,value)=>dispatch({type:'details',field,value}),updatePart:(number,value)=>dispatch({type:'part',number,value})}),[test,basePath]);if(!test)return<p>Test not found. Return to Test Management.</p>;return<Context.Provider value={value}><Outlet/></Context.Provider>}
