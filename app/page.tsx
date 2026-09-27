import Hub from './hub';
import {getUser,ownerExists} from '@/lib/auth';
import Login from './login';
import {configured} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){if(!configured())return <main className="auth-page"><section className="auth-panel"><div className="auth-form"><h1>Deployment setup required</h1><p>Add the Supabase environment variables in your hosting settings, run the database migration, then redeploy. See DEPLOYMENT.md in the project.</p></div></section></main>;const user=await getUser();return user?<Hub signedIn={true}/>:<Login setupAvailable={!await ownerExists()}/>;}
