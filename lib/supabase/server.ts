import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';

export function configured(){return !!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SECRET_KEY&&process.env.DATABASE_URL);}
export async function supabase(){const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'},cookies:{getAll:()=>jar.getAll(),setAll(values){try{for(const {name,value,options} of values)jar.set(name,value,options);}catch{/* Server Components refresh through proxy.ts. */}}}});}
export function supabaseAdmin(){if(!process.env.SUPABASE_SECRET_KEY)throw new Error('Account administration is not configured.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY,{auth:{autoRefreshToken:false,persistSession:false}});}
