import { normalizeGrammarTest } from './grammarTestData';

const KEY = 'aptimate-admin-grammar-tests';
export function getStoredGrammarTests(){try{const tests=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(tests)?tests.map(normalizeGrammarTest):[]}catch{return[]}}
export function getStoredGrammarTest(id){return getStoredGrammarTests().find((test)=>String(test.id)===String(id))||null}
export function saveStoredGrammarTest(test){const tests=getStoredGrammarTests();const normalized=normalizeGrammarTest(test);const saved={...normalized,id:test.id||`grammar-${Date.now()}`,name:test.details.title,component:'Grammar & Vocab',section:normalized.mode==='full'?'Full Test':normalized.mode.replace('part','Part '),status:'Done',dateAdded:test.dateAdded||new Date().toISOString(),attempts:test.attempts||0,questionType:normalized.mode==='part1'?'Multiple Choice':normalized.mode==='part2'?'Word Matching':'Mixed',updatedAt:new Date().toISOString()};const index=tests.findIndex((item)=>item.id===saved.id);if(index>=0)tests[index]=saved;else tests.unshift(saved);localStorage.setItem(KEY,JSON.stringify(tests));window.dispatchEvent(new Event('grammar-tests-updated'));return saved}
export function deleteStoredGrammarTest(id){localStorage.setItem(KEY,JSON.stringify(getStoredGrammarTests().filter((test)=>test.id!==id)));window.dispatchEvent(new Event('grammar-tests-updated'))}
