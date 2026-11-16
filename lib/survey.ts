import {z} from 'zod';
export const pointSchema=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)});
export const strokeSchema=z.object({id:z.string().max(80),route:z.enum(['A','B']),direction:z.enum(['H','R','HR']),points:z.array(pointSchema).min(2).max(2500)});
export const hazardSchema=z.object({id:z.string().max(80),x:z.number().min(0).max(1),y:z.number().min(0).max(1),kind:z.enum(['','Unfall','Beinaheunfall','Unsicher']),place:z.string().max(200),description:z.string().max(2000),time:z.enum(['','morgens','nachmittags','beides'])});
export const draftSchema=z.object({id:z.string().uuid(),code:z.string().trim().min(1).max(40),classGroup:z.string().trim().max(30),method:z.enum(['digital','paper']),strokes:z.array(strokeSchema).max(100),hazards:z.array(hazardSchema).max(3),noHazards:z.boolean(),modes:z.array(z.enum(['zu Fuß','Roller','Fahrrad','Bus / Bahn','Auto'])).max(5),days:z.object({AH:z.number().int().min(0).max(5),AR:z.number().int().min(0).max(5),BH:z.number().int().min(0).max(5),BR:z.number().int().min(0).max(5)}),exception:z.string().max(1500),consent:z.literal(true)});
export const surveySchema=draftSchema.superRefine((s,c)=>{
 if(s.method==='digital'){
  if(!s.strokes.length)c.addIssue({code:'custom',message:'Bitte mindestens einen Weg einzeichnen.',path:['strokes']});
  if(s.hazards.some(h=>!h.kind||h.description.trim().length<3))c.addIssue({code:'custom',message:'Bitte jede markierte Stelle beschreiben und einordnen.',path:['hazards']});
  if(!s.hazards.length&&!s.noHazards)c.addIssue({code:'custom',message:'Bitte Stellen markieren oder „Keine schwierige Stelle“ auswählen.',path:['hazards']});
  if(s.days.AH+s.days.BH>5||s.days.AR+s.days.BR>5)c.addIssue({code:'custom',message:'Hin- und Rückwege dürfen jeweils höchstens fünf Schultage ergeben.',path:['days']});
 }
});
export type Point=z.infer<typeof pointSchema>;export type Stroke=z.infer<typeof strokeSchema>;export type Hazard=z.infer<typeof hazardSchema>;export type SurveyData=z.infer<typeof surveySchema>;
export type Attachment={key:string;name:string;type:string;size:number};
export type SavedResponse={id:string;code:string;classGroup:string;method:string;createdAt:string;payload:SurveyData;attachments:Attachment[]};
export function newId():string{if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export function emptySurvey():Omit<SurveyData,'consent'>&{consent:boolean}{return {id:newId(),code:'W-'+newId().slice(0,6).toUpperCase(),classGroup:'',method:'digital',strokes:[],hazards:[],noHazards:false,modes:[],days:{AH:0,AR:0,BH:0,BR:0},exception:'',consent:false};}
export function normalizedPoint(clientX:number,clientY:number,r:{left:number;top:number;width:number;height:number}):Point{return {x:Math.max(0,Math.min(1,(clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(clientY-r.top)/r.height))};}
