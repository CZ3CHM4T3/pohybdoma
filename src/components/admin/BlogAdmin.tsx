"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Heading, List, AlignLeft, AlignCenter, AlignRight,
  ImagePlus, Type, Eye, EyeOff, Trash2, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Post = { id: number; slug: string; title: string; content: string; cover_url: string | null; published: boolean; created_at: string };

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || ("clanek-" + Date.now());
}

export function BlogAdmin() {
  const supabase = createClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data as Post[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function reset() {
    setEditId(null); setTitle(""); setCover(null); setPublished(false); setMsg(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
  }
  function startEdit(p: Post) {
    setEditId(p.id); setTitle(p.title); setCover(p.cover_url); setPublished(p.published); setMsg(null);
    if (editorRef.current) editorRef.current.innerHTML = p.content || "";
  }

  function cmd(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  async function uploadImg(file: File): Promise<string | null> {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("community").upload(path, file, { upsert: true });
    if (error) { setMsg("Nahrání obrázku selhalo: " + error.message); return null; }
    return supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
  }
  async function insertImage(file: File) {
    setUploading(true);
    const url = await uploadImg(file);
    setUploading(false);
    if (url) { editorRef.current?.focus(); document.execCommand("insertImage", false, url); }
  }
  async function setCoverImg(file: File) {
    setUploading(true);
    const url = await uploadImg(file);
    setUploading(false);
    if (url) setCover(url);
  }

  async function save() {
    if (!title.trim()) { setMsg("Vyplň název článku."); return; }
    const content = editorRef.current?.innerHTML ?? "";
    setMsg(null);
    if (editId) {
      const { error } = await supabase.from("blog_posts").update({ title: title.trim(), content, cover_url: cover, published, updated_at: new Date().toISOString() }).eq("id", editId);
      if (error) { setMsg("Uložení selhalo (spustil jsi blog.sql?): " + error.message); return; }
    } else {
      const { error } = await supabase.from("blog_posts").insert({ slug: slugify(title), title: title.trim(), content, cover_url: cover, published });
      if (error) { setMsg("Uložení selhalo (spustil jsi blog.sql?): " + error.message); return; }
    }
    setMsg("Uloženo. ✅");
    reset(); load();
  }
  async function togglePublish(p: Post) {
    await supabase.from("blog_posts").update({ published: !p.published }).eq("id", p.id);
    load();
  }
  async function del(id: number) {
    await supabase.from("blog_posts").delete().eq("id", id);
    if (editId === id) reset();
    load();
  }

  const TB = "flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-brand-light hover:text-brand-blue";

  return (
    <section className="card p-6 mt-8">
      <h2 className="mb-1 text-lg font-semibold text-brand-dark">Blog</h2>
      <p className="mb-5 text-sm text-gray-500">Napiš článek, naformátuj ho a přidej fotky. Publikovaný se objeví na /blog.</p>

      {/* Seznam článků */}
      {posts.length > 0 && (
        <div className="mb-6 space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark">{p.title}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.published ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{p.published ? "publikováno" : "koncept"}</span>
              <button onClick={() => togglePublish(p)} className="shrink-0 text-gray-400 hover:text-brand-blue" title={p.published ? "Skrýt" : "Publikovat"}>{p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              <button onClick={() => startEdit(p)} className="shrink-0 text-xs font-semibold text-brand-blue hover:underline">Upravit</button>
              <button onClick={() => del(p.id)} className="shrink-0 text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="rounded-xl border border-gray-100 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-dark">{editId ? "Upravit článek" : "Nový článek"}</p>
          {editId && <button onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand-dark"><Plus className="h-3.5 w-3.5" /> Nový</button>}
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Název článku" className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue" />

        {/* Úvodní fotka */}
        <div className="mb-3 flex items-center gap-3">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-12 w-20 rounded object-cover ring-1 ring-gray-200" />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-brand-blue hover:bg-brand-light">
            <ImagePlus className="h-4 w-4" /> {cover ? "Změnit úvodní fotku" : "Úvodní fotka"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCoverImg(f); e.target.value = ""; }} />
          </label>
          {cover && <button onClick={() => setCover(null)} className="text-xs text-gray-400 hover:text-red-500">odebrat</button>}
        </div>

        {/* Lišta nástrojů */}
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
          <button onClick={() => cmd("bold")} className={TB} title="Tučně"><Bold className="h-4 w-4" /></button>
          <button onClick={() => cmd("italic")} className={TB} title="Kurzíva"><Italic className="h-4 w-4" /></button>
          <button onClick={() => cmd("underline")} className={TB} title="Podtržení"><Underline className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <button onClick={() => cmd("formatBlock", "<h2>")} className={TB} title="Nadpis"><Heading className="h-4 w-4" /></button>
          <button onClick={() => cmd("formatBlock", "<p>")} className={TB} title="Normální text"><Type className="h-4 w-4" /></button>
          <button onClick={() => cmd("fontSize", "2")} className={`${TB} text-xs`} title="Menší písmo">A−</button>
          <button onClick={() => cmd("fontSize", "5")} className={`${TB} text-base`} title="Větší písmo">A+</button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <button onClick={() => cmd("justifyLeft")} className={TB} title="Vlevo"><AlignLeft className="h-4 w-4" /></button>
          <button onClick={() => cmd("justifyCenter")} className={TB} title="Na střed"><AlignCenter className="h-4 w-4" /></button>
          <button onClick={() => cmd("justifyRight")} className={TB} title="Vpravo"><AlignRight className="h-4 w-4" /></button>
          <button onClick={() => cmd("insertUnorderedList")} className={TB} title="Odrážky"><List className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <label className={`${TB} cursor-pointer`} title="Vložit obrázek">
            <ImagePlus className="h-4 w-4" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }} />
          </label>
          {uploading && <span className="ml-1 text-xs text-gray-400">nahrávám…</span>}
        </div>

        {/* Plocha pro psaní */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="blog-content min-h-[240px] w-full rounded-lg border border-gray-200 p-4 text-base leading-relaxed text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={save} className="btn-primary text-sm">{editId ? "Uložit změny" : "Vytvořit článek"}</button>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" />
            Publikovat (zobrazit na webu)
          </label>
          {msg && <span className="text-xs font-medium text-gray-500">{msg}</span>}
        </div>
      </div>
    </section>
  );
}
