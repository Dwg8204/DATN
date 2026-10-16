export type KnowledgeSection={heading:string;text:string};
export type KnowledgeChunk={content:string;heading:string;tokenCount:number};
/** Count with the embedding model's tokenizer, never with whitespace word counts. */
export async function chunkSections(title:string,sections:KnowledgeSection[],count:(text:string)=>Promise<number>):Promise<KnowledgeChunk[]> {
  const chunks:KnowledgeChunk[]=[];
  for(const section of sections) {
    const prefix=`${title}\n${section.heading}\n`;
    const split=async(text:string):Promise<void>=>{
      const content=prefix+text.trim(),tokenCount=await count(content);
      if(!Number.isInteger(tokenCount)||tokenCount<1)throw Error('INVALID_TOKEN_COUNT');
      if(tokenCount<=600){chunks.push({content,heading:section.heading,tokenCount});return;}
      // Prefer paragraph/sentence boundaries; do not cut a rule from its short example.
      const boundaries=[...text.matchAll(/\n\s*\n|(?<=[.!?])\s+/gu)].map(m=>m.index!+m[0].length);
      const middle=text.length/2;
      const at=boundaries.filter(n=>n>0&&n<text.length).sort((a,b)=>Math.abs(a-middle)-Math.abs(b-middle))[0];
      if(!at)throw Error('SECTION_TOO_LONG: add paragraph boundaries before importing');
      await split(text.slice(0,at));await split(text.slice(at));
    };
    await split(section.text);
  }
  return chunks;
}
