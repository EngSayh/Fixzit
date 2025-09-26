"use client";
import { useEffect, useState } from "react";

export default function AdminCMS(){
  const [slug,setSlug]=useState("privacy");
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  const [status,setStatus]=useState<"DRAFT"|"PUBLISHED">("PUBLISHED");

  useEffect(()=>{
    (async()=>{
      const r = await fetch(`/api/cms/pages/${slug}`);
      if (r.ok){
        const p = await r.json();
        setTitle(p.title); setContent(p.content); setStatus(p.status);
      } else {
        setTitle(""); setContent(""); setStatus("DRAFT");
      }
    })();
  },[slug]);

  const save = async()=>{
    const r = await fetch(`/api/cms/pages/${slug}`, { 
      method:"PATCH", 
      headers:{ 
        "content-type":"application/json",
        "x-user": JSON.stringify({ id: 'admin', role: 'SUPER_ADMIN', tenantId: 't0' })
      }, 
      body:JSON.stringify({ title, content, status }) 
    });
    alert(r.ok ? "Saved" : "Failed");
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-3">
      <h1 className="text-2xl font-semibold">CMS Pages</h1>
      <div className="flex gap-2">
        <input className="px-3 py-2 border border-gray-300 rounded-md" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="Slug (e.g., privacy)" />
        <select className="px-3 py-2 border border-gray-300 rounded-md" value={status} onChange={e=>setStatus(e.target.value as "DRAFT"|"PUBLISHED")}>
          <option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option>
        </select>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={save}>Save</button>
      </div>
      <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" />
      <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md h-[420px]" value={content} onChange={e=>setContent(e.target.value)} placeholder="Markdown content..." />
    </div>
  );
}
