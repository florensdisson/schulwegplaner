import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {surveySchema,type Attachment} from '../../../lib/survey';
import map from '../../../lib/map.json';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function identity(){const u=await getChatGPTUser();return u?.userId;}
// Verified Site owner; never accept roles or owner identity from form fields.
async function isCoordinator(){const u=await getChatGPTUser();const email=env.COORDINATOR_EMAIL?.trim().toLowerCase();return Boolean(email && u?.email.toLowerCase()===email);}
function sameOrigin(r:Request){const o=r.headers.get('origin');return !o||new URL(o).host===new URL(r.url).host||new URL(o).host===r.headers.get('host');}
function bindings(){if(!env.DB||!env.BUCKET)throw new Error('Speicher ist nicht verfügbar.');return {db:env.DB,bucket:env.BUCKET};}
export async function GET(r:Request){
 const user=await identity();if(!user)return json({error:'Bitte anmelden, um Rückläufe zu öffnen.'},401);
 try{const {db,bucket}=bindings();const coordinator=await isCoordinator();const u=new URL(r.url);const id=u.searchParams.get('id');
 if(id){const row=await db.prepare('SELECT attachments FROM responses WHERE id=? AND (user_id=? OR ?=1)').bind(id,user,coordinator?1:0).first<{attachments:string}>();if(!row)return json({error:'Bogen nicht gefunden.'},404);
 const list:Attachment[]=JSON.parse(row.attachments);const i=Number(u.searchParams.get('file'));if(!Number.isInteger(i)||!list[i])return json({error:'Datei nicht gefunden.'},404);const f=list[i];const obj=await bucket.get(f.key);if(!obj)return json({error:'Datei nicht gefunden.'},404);
 return new Response(obj.body,{headers:{'Content-Type':f.type,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
 const rows=await db.prepare('SELECT id,code,class_group AS classGroup,method,payload,attachments,created_at AS createdAt FROM responses WHERE user_id=? OR ?=1 ORDER BY created_at DESC').bind(user,coordinator?1:0).all();
 return json({scope:coordinator?'all':'own',responses:rows.results.map((x:any)=>({...x,payload:JSON.parse(x.payload),attachments:JSON.parse(x.attachments)}))});
 }catch(e){console.error('Read response failed',e instanceof Error?e.message:'storage');return json({error:'Rückläufe konnten nicht geladen werden. Bitte erneut versuchen.'},500);}
}
function detectedType(b:Uint8Array):string|null{
 if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)return 'image/png';
 if(String.fromCharCode(...b.slice(0,5))==='%PDF-')return 'application/pdf';
 if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'image/webp';
 if(String.fromCharCode(...b.slice(4,8))==='ftyp'&&/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(String.fromCharCode(...b.slice(8,12))))return 'image/heic';
 return null;
}
export async function POST(r:Request){
 const user=await identity();if(!user)return json({error:'Bitte anmelden, bevor du einen Bogen einreichst.'},401);
 if(!sameOrigin(r))return json({error:'Anfrage nicht erlaubt.'},403);
 if(Number(r.headers.get('content-length')||0)>27*1024*1024)return json({error:'Die Dateien sind zusammen zu groß (maximal 25 MB).'},413);
 let created:Attachment[]=[];
 try{const {db,bucket}=bindings();const form=await r.formData();const raw=form.get('data');if(typeof raw!=='string'||raw.length>2*1024*1024)return json({error:'Die Eingabe ist zu groß oder unvollständig.'},400);
 let candidate:unknown;try{candidate=JSON.parse(raw);}catch{return json({error:'Die Eingabe ist nicht lesbar.'},400);}
 const parsed=surveySchema.safeParse(candidate);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);const data=parsed.data;
 const existing=await db.prepare('SELECT id,user_id FROM responses WHERE id=?').bind(data.id).first<{id:string;user_id:string}>();
 if(existing)return existing.user_id===user?json({id:existing.id,code:data.code,alreadySaved:true}):json({error:'Bitte einen neuen Bogen beginnen.'},409);
 const files=form.getAll('files').filter((v):v is File=>typeof v!=='string');
 if(data.method==='paper'&&!files.length)return json({error:'Bitte ein Foto oder eine PDF des ausgefüllten Bogens auswählen.'},400);
 if(files.length>6||files.some(f=>!f.size||f.size>10*1024*1024)||files.reduce((a,f)=>a+f.size,0)>25*1024*1024)return json({error:'Maximal 6 Dateien, 10 MB je Datei und insgesamt 25 MB sind möglich.'},400);
 for(const file of files){const bytes=await file.arrayBuffer();const type=detectedType(new Uint8Array(bytes));if(!type)throw new Error('Bitte JPG, PNG, WEBP, HEIC oder PDF verwenden.');
 const key='responses/'+data.id+'/'+crypto.randomUUID();const info={key,name:file.name.replace(/[\r\n\x00-\x1f]/g,'').slice(0,180)||'Erhebungsbogen',type,size:file.size};
 await bucket.put(key,bytes,{httpMetadata:{contentType:type}});created.push(info);}
 const now=new Date().toISOString();const payload={...data,map};
 await db.prepare('INSERT INTO responses (id,user_id,code,class_group,method,payload,attachments,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(data.id,user,data.code,data.classGroup,data.method,JSON.stringify(payload),JSON.stringify(created),now).run();
 return json({id:data.id,code:data.code,createdAt:now},201);
 }catch(e){if(env.BUCKET&&created.length)await Promise.allSettled(created.map(x=>env.BUCKET!.delete(x.key)));const msg=e instanceof Error?e.message:'';console.error('Save response failed',msg);return json({error:msg.startsWith('Bitte ')?msg:'Speichern hat nicht geklappt. Dein Entwurf bleibt erhalten. Bitte erneut versuchen.'},500);}
}
export async function DELETE(r:Request){
 const user=await identity();if(!user)return json({error:'Bitte anmelden.'},401);if(!sameOrigin(r))return json({error:'Anfrage nicht erlaubt.'},403);
 try{const {db,bucket}=bindings();const coordinator=await isCoordinator();const {id}=await r.json() as {id:string};const row=await db.prepare('SELECT attachments FROM responses WHERE id=? AND (user_id=? OR ?=1)').bind(id,user,coordinator?1:0).first<{attachments:string}>();if(!row)return json({error:'Bogen nicht gefunden.'},404);const files:Attachment[]=JSON.parse(row.attachments);if(files.length)await bucket.delete(files.map(f=>f.key));await db.prepare('DELETE FROM responses WHERE id=? AND (user_id=? OR ?=1)').bind(id,user,coordinator?1:0).run();return json({ok:true});}catch{return json({error:'Löschen hat nicht geklappt. Bitte erneut versuchen.'},500);}
}
