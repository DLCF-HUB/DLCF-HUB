'use client';
import {useState} from 'react';
import {ArrowRight,LockKeyhole} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';

export default function Login({setupAvailable}:{setupAvailable:boolean}){
  const [mode,setMode]=useState(setupAvailable?'setup':'login');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const data=Object.fromEntries(new FormData(e.currentTarget));if(mode!=='login'&&data.password!==data.confirm){setError('Your passwords do not match.');setBusy(false);return;}try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,action:mode})});const body=await r.json() as {error?:string,signInRequired?:boolean};if(!r.ok)throw new Error(body.error||'Unable to sign in.');if(body.signInRequired){setMode('login');setError('Account created. Please sign in with your email and password.');setBusy(false);return;}window.location.replace('/');}catch(e){setError(e instanceof Error?e.message:'Check your connection and try again.');setBusy(false);}}
  return <main className="auth-page"><section className="auth-brand"><img src="/logo.png" alt="DLCF logo"/><span className="eyebrow">DEEPER LIFE CAMPUS FELLOWSHIP</span><h1>Your fellowship.<br/>One workspace.</h1><p>Members, services and campus records for DLCF Buea.</p><div className="auth-campus">Dirty South Campus · Bonduma Campus</div></section><section className="auth-panel"><div className="auth-form"><div className="auth-mark"><LockKeyhole size={24}/></div><h2>{mode==='setup'?'Set up your administrator account':mode==='activate'?'Activate your account':'Welcome back'}</h2><p>{mode==='setup'?'Use the setup code provided with your app link.':mode==='activate'?'Enter the invitation code from your campus administrator.':'Sign in with your fellowship email and password.'}</p><Tabs value={mode} onValueChange={v=>{setMode(v);setError('');}}><TabsList className="auth-tabs"><TabsTrigger value="login">Sign in</TabsTrigger><TabsTrigger value="activate">Activate account</TabsTrigger>{setupAvailable&&<TabsTrigger value="setup">Admin setup</TabsTrigger>}</TabsList></Tabs><form onSubmit={submit} key={mode}>
  {mode!=='login'&&<label>Full name<input name="name" autoComplete="name" maxLength={120} required/></label>}
  <label>Email address<input name="email" type="email" autoComplete="username" maxLength={254} required/></label>
  {mode!=='login'&&<label>{mode==='setup'?'Administrator setup code':'Invitation code'}<input name="code" autoComplete="off" spellCheck={false} required/></label>}
  <label>Password<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?undefined:12} maxLength={128} required/></label>
  {mode!=='login'&&<><small>Use at least 12 characters.</small><label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label></>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  <button className="btn primary auth-submit" disabled={busy} type="submit">{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}{!busy&&<ArrowRight size={18}/>}</button>
  </form><p className="auth-help">{mode==='login'?'Need an account? Ask your campus administrator for an invitation code.':'Keep your password private. Your code works once.'}</p></div></section></main>;
}
