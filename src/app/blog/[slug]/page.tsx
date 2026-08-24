import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Props { params: Promise<{ slug: string }> }

export const dynamic = "force-dynamic";

type Post = { slug: string; title: string; content: string; cover_url: string | null; created_at: string };

async function getPost(slug: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug,title,content,cover_url,created_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return (data as Post) ?? null;
}

function excerpt(html: string, n = 155): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Článek nenalezen" };
  const desc = excerpt(post.content);
  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      type: "article",
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.created_at,
    dateModified: post.created_at,
    image: post.cover_url ? [post.cover_url] : undefined,
    description: excerpt(post.content),
    author: { "@type": "Person", name: "Mgr. Jan Schröffel" },
    publisher: { "@type": "Organization", name: "POHYB DOMA", logo: { "@type": "ImageObject", url: "https://pohybdoma.cz/LOGO.png" } },
    mainEntityOfPage: `https://pohybdoma.cz/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-white py-12 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link href="/blog" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zpět na blog
        </Link>

        <p className="text-xs text-gray-400">
          {new Date(post.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="mt-1 mb-6 text-3xl lg:text-4xl font-semibold leading-tight text-brand-dark">{post.title}</h1>

        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_url} alt={post.title} className="mb-8 w-full rounded-2xl object-cover shadow" />
        )}

        <div className="blog-content text-lg leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: post.content }} />

        <div className="mt-12 border-t border-gray-100 pt-6 text-right">
          <p className="text-sm text-gray-500">— Honza · POHYB DOMA</p>
        </div>
      </article>
    </div>
  );
}
