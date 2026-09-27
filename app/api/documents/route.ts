import {checkOrigin} from '@/lib/auth';
import {identity,db,auditStatement,textValue as str,numberValue as num,fail} from '@/lib/server';
import {supabaseAdmin} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const BUCKET='fellowship-documents';
export async function POST(request:Request){try{
 checkOrigin(request);const d=await request.json() as any,campus=str(d.campus),ctx=await identity(campus);
 if(!ctx.permissions.documents)throw new Error('You do not have permission to upload documents.');
 const storage=supabaseAdmin().storage.from(BUCKET);
 if(d.action==='prepare'){
  const size=num(d.size,10*1024*1024);if(!size||!['application/pdf','image/jpeg','image/png'].includes(d.mime))throw new Error('Choose a PDF, JPG or PNG below 10 MB.');
  const title=str(d.title);if(!title)throw new Error('Enter a document title.');
  const id=crypto.randomUUID(),path=campus+'/'+id;
  const signed=await storage.createSignedUploadUrl(path,{upsert:false});if(signed.error)throw new Error('Unable to prepare the upload.');
  await db().prepare('INSERT INTO pending_uploads(id,campus,account_id,title,category,filename,mime,size,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)').bind(id,campus,ctx.user.userId,title,str(d.category)||'Other',str(d.filename,200),d.mime,size,Date.now()+2*3600000).run();
  return Response.json({id,bucket:BUCKET,path,token:signed.data.token},{headers:{'Cache-Control':'no-store'}});
 }
 if(d.action!=='finish')throw new Error('Unknown upload action.');
 const pending=await db().prepare('SELECT * FROM pending_uploads WHERE id=$1 AND campus=$2 AND account_id=$3 AND expires_at>$4').bind(str(d.id),campus,ctx.user.userId,Date.now()).first<any>();if(!pending)throw new Error('This upload has expired. Please try again.');
 const info=await storage.info(campus+'/'+pending.id);
 if(info.error||!info.data)throw new Error('The file has not finished uploading. Try again.');
 if(info.data.size!==pending.size||info.data.contentType!==pending.mime){await storage.remove([campus+'/'+pending.id]);throw new Error('The uploaded file does not match the selected file.');}
 await db().batch([
  db().prepare('INSERT INTO documents(id,campus,title,category,date,filename,mime,size,author) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)').bind(pending.id,campus,pending.title,pending.category,new Date().toISOString().slice(0,10),pending.filename,pending.mime,pending.size,ctx.user.email),
  db().prepare('DELETE FROM pending_uploads WHERE id=$1').bind(pending.id),
  await auditStatement(campus,'Document uploaded',pending.id,ctx.user.email)
 ]);return Response.json({ok:true,id:pending.id});
}catch(e){return fail(e);}}
export async function GET(request:Request){try{
 const u=new URL(request.url),campus=u.searchParams.get('campus')||'',ctx=await identity(campus);
 if(!ctx.permissions.documents)throw new Error('You do not have permission to access this document.');
 const doc=await db().prepare('SELECT * FROM documents WHERE id=$1 AND campus=$2').bind(u.searchParams.get('id'),campus).first<any>();if(!doc)throw new Error('Document not found.');
 const result=await supabaseAdmin().storage.from(BUCKET).createSignedUrl(campus+'/'+doc.id,60,{download:doc.filename});if(result.error)throw new Error('Document unavailable.');
 return new Response(null,{status:302,headers:{Location:result.data.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}catch(e){return fail(e);}}
