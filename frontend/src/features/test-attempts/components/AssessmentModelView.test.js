import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const code=transformSync(readFileSync(new URL('./AssessmentModelView.jsx',import.meta.url),'utf8'),{loader:'jsx',format:'cjs',jsx:'automatic'}).code;
function harness(query) {
  let params=new URLSearchParams(query);
  const jsx=(type,props)=>({type,props});
  const module={exports:{}};
  runInNewContext(code,{module,URLSearchParams,require:name=>{
    if(name==='react/jsx-runtime') return {jsx,jsxs:jsx};
    if(name==='react') return {useEffect:()=>{},useState:initial=>[initial,()=>{}]};
    if(name==='react-router-dom') return {Link:'Link',useSearchParams:()=>[params,next=>{params=next(params);} ]};
    return {__esModule:true,default:{},testAttemptsApi:{},practiceAttemptsApi:{}};
  }});
  return {render:()=>module.exports.default({children:'GEMINI_RESULT',skill:'speaking'}),params:()=>params};
}
test('both models use the same page and selecting Groq preserves attempt, practice and part',()=>{
  const h=harness('attemptId=123&practice=true&part=3');
  const tree=h.render();
  assert.equal(tree.props.children[1],'GEMINI_RESULT');
  const buttons=tree.props.children[0].props.children;
  assert.equal(buttons[0].props['aria-pressed'],true);
  buttons[1].props.onClick();
  assert.equal(h.params().get('model'),'groq');
  assert.equal(h.params().get('attemptId'),'123');
  assert.equal(h.params().get('part'),'3');
  assert.equal(h.params().get('practice'),'true');
  assert.equal(h.render().props.children[1],'GEMINI_RESULT');
});
test('unknown model falls back to primary Gemini',()=>{
  assert.equal(harness('attemptId=123&model=unknown').render().props.children[1],'GEMINI_RESULT');
});
