import { createContext, useContext, useMemo, useReducer } from 'react';
import { createGrammarTestDraft } from '../data/grammarTestData';
const Context=createContext(null);
function reducer(state,action){if(action.type==='DETAIL')return{...state,details:{...state.details,[action.field]:action.value}};if(action.type==='PART')return{...state,parts:{...state.parts,[action.part]:action.value}};return state}
export function GrammarTestBuilderProvider({children,initialTest,basePath}){const[test,dispatch]=useReducer(reducer,initialTest||createGrammarTestDraft());const value=useMemo(()=>({test,basePath,updateDetails:(field,value)=>dispatch({type:'DETAIL',field,value}),updatePart:(part,value)=>dispatch({type:'PART',part,value})}),[test,basePath]);return <Context.Provider value={value}>{children}</Context.Provider>}
export function useGrammarTestBuilder(){const value=useContext(Context);if(!value)throw new Error('Grammar builder context is missing');return value}
