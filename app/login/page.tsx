'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  async function onSubmit(){ setLoading(true); setTimeout(()=>setLoading(false),600); }

  return (
    <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <div className="space-y-3">
        <Input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <Input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <Button onClick={onSubmit} disabled={loading || !email || !password}>{loading? 'Please wait…':'Sign In'}</Button>
      </div>
    </div>
  );
}
