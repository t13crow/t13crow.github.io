// Server-only module. Deploy separately from GitHub Pages.
// Required environment secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
// TURNSTILE_SECRET_KEY. No credentials belong in this repository.
const ORIGIN = 'https://t13crow.github.io';
export default {
  async fetch(request, env) {
    const headers = {'Content-Type':'application/json','Cache-Control':'no-store',
      'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin',
      'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
    const reply = (status, error) => new Response(JSON.stringify(error ? {ok:false,error,code:error} : {ok:true}),{status,headers});
    if (request.headers.get('Origin') !== ORIGIN) return reply(403,'forbidden');
    if (new URL(request.url).pathname !== '/api/contact') return reply(404,'not_found');
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return reply(405,'method');
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.TURNSTILE_SECRET_KEY) return reply(503,'unavailable');
    if (!request.headers.get('Content-Type')?.includes('application/json')) return reply(415,'invalid');
    let input;
    try {
      const reader = request.body.getReader(); let length=0; const chunks=[];
      while (true) {const {done,value}=await reader.read();if(done)break;length+=value.length;
        if(length>16384){await reader.cancel();return reply(413,'invalid');}chunks.push(value);}
      const bytes=new Uint8Array(length);let offset=0;
      for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      input=JSON.parse(new TextDecoder().decode(bytes));
    } catch {return reply(400,'invalid');}
    if(!input || typeof input!=='object' || Array.isArray(input)) return reply(400,'invalid');
    const limits={name:100,email:254,phone:150,city:30,type:30,date:10,message:3000};
    const data={};
    for(const [key,limit] of Object.entries(limits)){
      if(input[key]!==undefined && typeof input[key]!=='string')return reply(400,'invalid');
      data[key]=(input[key]||'').trim();
      if(data[key].length>limit)return reply(400,'invalid');
    }
    if(input.website)return reply(400,'spam');
    if(input.consent!==true || !data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
       || !['istanbul','moscow','other'].includes(data.city)
       || !['portrait','street','fashion','lifestyle','wedding','other'].includes(data.type)
       || !data.message)return reply(400,'invalid');
    if(typeof input.turnstileToken!=='string' || input.turnstileToken.length>2048)return reply(400,'spam');
    try {
      const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:input.turnstileToken}),
        signal:AbortSignal.timeout(8000)});
      const verified=await verification.json();
      if(!verification.ok || !verified.success || verified.hostname!=='t13crow.github.io' || verified.action!=='photography-inquiry')return reply(400,'spam');
      const text=['New photography inquiry — ФАНТАЗЁР',
        ...Object.entries(data).map(([key,value])=>key+': '+(value||'—'))].join('\n');
      const sent=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text,link_preview_options:{is_disabled:true}}),
        signal:AbortSignal.timeout(10000)});
      const result=await sent.json();
      return sent.ok && result.ok ? reply(200) : reply(502,'error');
    } catch {return reply(502,'error');}
  }
};
