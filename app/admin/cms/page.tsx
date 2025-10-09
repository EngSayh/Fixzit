"use client";
import { useEffect, useState } from "react";

/**
 * Admin UI for viewing and editing CMS pages.
 *
 * Renders a simple editor that lets you select a page by slug, edit its title,
 * markdown content, and publication status, and save changes back to the server.
 *
 * Behavior:
 * - Loads page data from GET /api/cms/pages/{slug} whenever the slug changes. If the page exists,
 *   title, content, and status are populated; otherwise fields are cleared and status defaults to DRAFT.
 * - Saves edits by sending a PATCH request with JSON body { title, content, status } to /api/cms/pages/{slug}.
 *   Shows a browser alert with "Saved" on success or "Failed" on failure.
 *
 * @returns A React element containing the CMS page editor UI.
 */
export default function AdminCMS(){
  const [slug,setSlug]=useState("privacy");
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  const [status,setStatus]=useState<"DRAFT"|"PUBLISHED">("DRAFT");

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
    try {
      const r = await fetch(`/api/cms/pages/${slug}`, { 
        method:"PATCH", 
        headers:{ 
          "content-type":"application/json"
        }, 
        body:JSON.stringify({ title, content, status }),
        credentials: "same-origin"
      });
      alert(r.ok ? "Saved" : `Failed: ${await r.text()}`);
    } catch {
      alert("Failed: network error");
    }
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

