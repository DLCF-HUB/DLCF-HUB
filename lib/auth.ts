import 'server-only';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {database} from './database';
import {supabase} from './supabase/server';
export const authDb=()=>database;
export function digest(value:string){return createHash('sha256').update(value).digest('hex');}
export function secret(){return randomBytes(32).toString('base64url');}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export async function getUser(){const client=await supabase();const {data:{user},error}=await client.auth.getUser();if(error||!user)return null;const row=await database.prepare('SELECT id,email,name,is_owner FROM auth_accounts WHERE id=$1').bind(user.id).first<any>();return row?{userId:row.id,email:row.email,displayName:row.name,isOwner:row.is_owner===1}:null;}
export async function ownerExists(){return !!await database.prepare('SELECT id FROM auth_accounts WHERE is_owner=1').first();}
export function setupHash(){return process.env.ADMIN_SETUP_HASH||'';}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');const allowed=process.env.APP_URL?new URL(process.env.APP_URL).origin:new URL(request.url).origin;if(origin!==allowed&&origin!==new URL(request.url).origin)throw new Error('Access denied. Refresh the page and try again.');}
export async function throttle(request:Request,email:string){const period=Math.floor(Date.now()/900000);const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||'unknown':'local';const keys=[digest('ip:'+ip),digest('account:'+email)];const rows=await database.batch(keys.map(key=>database.prepare('INSERT INTO auth_attempts(key,period,count) VALUES($1,$2,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.period=excluded.period THEN auth_attempts.count+1 ELSE 1 END,period=excluded.period RETURNING count').bind(key,period)));if(rows.some((r,i)=>Number(r.results[0]?.count)>(i===0?60:12)))throw new Error('Too many attempts. Try again in 15 minutes.');await database.prepare('DELETE FROM auth_attempts WHERE period<$1').bind(period-1).run();}
