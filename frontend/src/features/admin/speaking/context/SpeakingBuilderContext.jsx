import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { createSpeakingDraft } from '../data/speakingTestModel';
import { speakingTestsApi } from '../services/speakingTestsApi';

const Context=createContext(null);
const reducer=(state,action)=>action.type==='init'?action.payload:action.type==='details'?{...state,details:{...state.details,[action.field]:action.value}}:action.type==='part'?{...state,parts:{...state.parts,[action.number]:action.value}}:state;
export const useSpeakingBuilder=()=>{const value=useContext(Context);if(!value)throw new Error('useSpeakingBuilder must be used inside SpeakingBuilderLayout');return value};
export default function SpeakingBuilderLayout(){
  const{testId}=useParams();const[params]=useSearchParams();const requested=params.get('mode');const mode=['part1','part2','part3','part4','full'].includes(requested)?requested:'full';
  const[test,dispatch]=useReducer(reducer,null);
  const[loading,setLoading]=React.useState(!!testId);
  const[error,setError]=React.useState(null);

  const initialMode = React.useRef(mode);
  React.useEffect(()=>{
    if(testId){
      speakingTestsApi.getOne(testId).then(data=>{
        dispatch({type:'init',payload:data});
      }).catch(err=>{
        console.error(err);
        setError('Test not found.');
      }).finally(()=>setLoading(false));
    } else {
      dispatch({type:'init',payload:createSpeakingDraft(initialMode.current)});
    }
  },[testId]);

  const basePath=testId?`/admin/tests/speaking/${testId}/edit`:'/admin/tests/new/speaking';
  const value=useMemo(()=>({test,basePath,updateDetails:(field,next)=>dispatch({type:'details',field,value:next}),updatePart:(number,next)=>dispatch({type:'part',number,value:next})}),[test,basePath]);
  
  if(loading)return <div style={{padding: '2rem', textAlign: 'center'}}>Loading test data...</div>;
  if(error)return<p>{error} Return to Test Management.</p>;
  if(!test)return null;

  return <Context.Provider value={value}><Outlet/></Context.Provider>
}
