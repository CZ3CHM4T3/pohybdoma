import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { NewsletterForm } from "@/components/NewsletterForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pohybová Myslánka",
  description: "Úvahy o pohybu, těle a životě.",
};

export const dynamic = "force-dynamic";

type Post = { slug: string; title: string; cover_url: string | null; created_at: string };

export default async function BlogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug,title,cover_url,created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });
  const posts = (data ?? []) as Post[];

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="up">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">Blog</p>
            <h1 className="text-4xl lg:text-5xl font-semibold text-brand-dark mb-4">Pohybová Myslánka</h1>
            <p className="text-lg text-gray-600 max-w-2xl">Úvahy o pohybu, těle a životě.</p>
          </Reveal>
        </div>
      </section>

      {/* Články */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <p className="text-gray-400">Zatím tu není žádný článek. Brzy přibude první. 🙂</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, i) => (
                <Reveal key={post.slug} variant="up" delay={i * 80}>
                  <Link href={`/blog/${post.slug}`} className="card card-3d h-full p-0 flex flex-col overflow-hidden">
                    <div className="relative aspect-video flex items-center justify-center bg-gradient-to-br from-brand-dark to-[#1256c0]">
                      {post.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <PenLine className="h-9 w-9 text-white/30" strokeWidth={2} />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="mb-2 text-lg font-semibold leading-snug text-brand-dark">{post.title}</h2>
                      <span className="mt-auto text-xs text-gray-400">
                        {new Date(post.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="relative overflow-hidden bg-brand-dark text-white py-16">
        <div className="pointer-events-none absolute -top-20 right-0 h-80 w-80 rounded-full bg-brand-blue/20 blur-3xl animate-float-slow" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <Reveal variant="up">
            <h2 className="mb-4 text-2xl lg:text-3xl font-semibold">Chceš vědět, až vyjde nový článek?</h2>
            <p className="mb-8 text-white/70">Přihlas se k odběru a nic ti neuteče – nové texty, videa i akce.</p>
            <NewsletterForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
