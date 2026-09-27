'use client';
import {createClient} from '@supabase/supabase-js';
export async function uploadDocument(file:File,campus:string,title:string,category:string){
 const prepare=await fetch('/api/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare',campus,title,category,filename:file.name,mime:file.type,size:file.size})});
 const data=await prepare.json();if(!prepare.ok)throw new Error(data.error);
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const upload=await client.storage.from(data.bucket).uploadToSignedUrl(data.path,data.token,file,{contentType:file.type,upsert:false});if(upload.error)throw new Error('Upload failed. Check your connection and try again.');
 return fetch('/api/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finish',campus,id:data.id})});
}
