import 'reflect-metadata';
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ChatbotProvider } from '../src/features/chatbot/chatbot.provider';
import { createGeminiServices } from '../src/features/ai-shared/create-gemini-services';

async function main() {
  const config=new ConfigService({...process.env,CHATBOT_ENABLED:'true'});
  const {client,generation}=createGeminiServices(config,{} as DataSource);
  const provider=new ChatbotProvider(config,client,generation);
  provider.assertReady();
  const model=process.env.CHATBOT_MODEL??'gemini-3.5-flash-lite';
  const reply=await provider.request(model,'generateContent',{
    contents:[{role:'user',parts:[{text:'Return only JSON {"text":"Xin chào","citationIds":[],"actions":[]}'}]}],
    generationConfig:{maxOutputTokens:256,temperature:0,responseMimeType:'application/json'},
  },AbortSignal.timeout(30000));
  const parsed=JSON.parse(reply.candidates?.[0]?.content?.parts?.filter((p:any)=>!p.thought).map((p:any)=>p.text??'').join('')??'');
  if(!parsed.text)throw new Error('INVALID_RESPONSE');
    console.log(JSON.stringify({chat:'OK',model,finishReason:reply.candidates?.[0]?.finishReason}));
  if(process.argv.includes('--embedding')) {
    const vector=await provider.embed('Aptis Writing formal and informal email',true,AbortSignal.timeout(30000));
    console.log(JSON.stringify({embedding:'OK',dimensions:vector.length,norm:Math.sqrt(vector.reduce((n,v)=>n+v*v,0))}));
  }
  if(process.argv.includes('--tokens')) {
    const result=await provider.request('gemini-embedding-001','countTokens',{contents:[{role:'user',parts:[{text:'Ví dụ tiếng Việt và English grammar.'}]}]},AbortSignal.timeout(30000));
    console.log(JSON.stringify({tokenizer:'gemini-embedding-001',totalTokens:result.totalTokens}));
  }
}
main().catch(e=>{console.error(JSON.stringify({smoke:'FAILED',code:e.code??e.name}));process.exitCode=1;});
