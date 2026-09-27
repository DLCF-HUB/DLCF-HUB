import {authDb,digest,secret,equal,getUser,ownerExists,setupHash,checkOrigin,throttle} from '@/lib/auth';
import {supabase,supabaseAdmin,configured} from '@/lib/supabase/server';
import {identity} from '@/lib/server';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){try{
 checkOrigin(request);if(!configured())return response({error:'Deployment setup is incomplete.'},503);
 const raw=await request.text();if(raw.length>8192)return response({error:'Request too large.'},413);
 const data=JSON.parse(raw),action=String(data.action||''),q=authDb(),client=await supabase();
 if(action==='logout'){const {error}=await client.auth.signOut({scope:'local'});if(error)throw new Error('Unable to sign out. Try again.');return response({ok:true});}
 if(action==='invite'){
  const ctx=await identity(String(data.campus||''));if(!ctx.permissions.admin)throw new Error('You do not have permission to invite members.');
  const email=String(data.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.');
  if(!await q.prepare('SELECT id FROM campuses WHERE id=$1').bind(data.campus).first())throw new Error('Campus not found.');
  if(await q.prepare('SELECT id FROM auth_accounts WHERE email=$1').bind(email).first())throw new Error('This email already has an account. Assign a campus role if needed.');
  const code=secret();await q.batch([q.prepare('DELETE FROM auth_invites WHERE email=$1 AND used_by IS NULL').bind(email),q.prepare('INSERT INTO auth_invites(token_hash,email,campus,expires_at,created_by) VALUES($1,$2,$3,$4,$5)').bind(digest(code),email,data.campus,Date.now()+7*86400000,ctx.user.userId)]);return response({ok:true,code,email});
 }
 const user=action==='password'?await getUser():null;
 const email=String(data.email||user?.email||'').trim().toLowerCase();await throttle(request,email);
 const password=String(data.password||'');
 if(action==='login'){
  if(password.length>128)return response({error:'Email or password is incorrect.'},401);
  const {data:login,error}=await client.auth.signInWithPassword({email,password});
  if(error||!login.user)return response({error:'Email or password is incorrect.'},401);
  if(!await q.prepare('SELECT id FROM auth_accounts WHERE id=$1').bind(login.user.id).first()){await client.auth.signOut({scope:'local'});return response({error:'This account has not been activated for the fellowship.'},403);}
  return response({ok:true});
 }
 if(password.length<12||password.length>128)throw new Error('Use a password with 12 to 128 characters.');
 if(action==='password'){
  if(!user)return response({error:'Sign in to continue.'},401);
  const check=await client.auth.signInWithPassword({email:user.email,password:String(data.currentPassword||'')});
  if(check.error)throw new Error('Your current password is incorrect.');
  const result=await client.auth.updateUser({password});if(result.error)throw new Error('Unable to update the password. Try a different password.');
  await client.auth.signOut({scope:'others'});return response({ok:true});
 }
 if(!['setup','activate'].includes(action))throw new Error('Unknown action.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter a valid email address.');
 const name=String(data.name||'').trim().slice(0,120),code=String(data.code||'').trim();if(!name)throw new Error('Enter your full name.');
 let invite:any=null;
 if(action==='setup'){
  if(await ownerExists())throw new Error('Administrator setup is complete. Sign in with your email and password.');
  if(!setupHash()||!equal(digest(code),setupHash()))throw new Error('The setup code is invalid.');
 }else{
  invite=await q.prepare('SELECT * FROM auth_invites WHERE token_hash=$1 AND email=$2 AND expires_at>$3 AND used_by IS NULL').bind(digest(code),email,Date.now()).first();
  if(!invite)throw new Error('The invitation code is invalid or expired.');
 }
 // A private setup secret or email-bound invitation authorizes account creation.
 const admin=supabaseAdmin();const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name}});
 if(created.error||!created.data.user)throw new Error('Unable to create this account. The email may already be registered.');
 const id=created.data.user.id,now=new Date().toISOString();
 try{
  if(action==='setup')await q.prepare('INSERT INTO auth_accounts(id,email,name,is_owner,created_at) VALUES($1,$2,$3,1,$4)').bind(id,email,name,now).run();
  else{
   await q.batch([
    q.prepare('INSERT INTO auth_accounts(id,email,name,created_at) SELECT $1,$2,$3,$4 WHERE EXISTS(SELECT 1 FROM auth_invites WHERE token_hash=$5 AND email=$6 AND expires_at>$7 AND used_by IS NULL)').bind(id,email,name,now,digest(code),email,Date.now()),
    q.prepare('UPDATE auth_invites SET used_by=$1 WHERE token_hash=$2 AND used_by IS NULL AND EXISTS(SELECT 1 FROM auth_accounts WHERE id=$3)').bind(id,digest(code),id),
    q.prepare('INSERT INTO grants(id,email,campus,role) SELECT $1,$2,$3,$4 WHERE EXISTS(SELECT 1 FROM auth_accounts WHERE id=$5) ON CONFLICT(email,campus) DO NOTHING').bind(crypto.randomUUID(),email,invite.campus,'Member',id)
   ]);
   if(!await q.prepare('SELECT id FROM auth_accounts WHERE id=$1').bind(id).first())throw new Error('This invitation has already been used.');
  }
 }catch(e){await admin.auth.admin.deleteUser(id);throw e;}
 const login=await client.auth.signInWithPassword({email,password});if(login.error)return response({ok:true,signInRequired:true});
 return response({ok:true});
}catch(error){console.error('Account request failed',error instanceof Error?error.message:'Unknown error');const message=error instanceof Error?error.message:'Unable to sign in. Please try again.';const safe=/constraint|duplicate key|connect|relation|supabase|postgres|fetch failed/i.test(message)?'Account service is unavailable or this email is already registered. Please try again.':message;return response({error:safe},/Too many/.test(message)?429:/Access denied|permission/.test(message)?403:400);}}
