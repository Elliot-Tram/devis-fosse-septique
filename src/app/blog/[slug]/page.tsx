import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { getArticle, getAllArticles } from "@/lib/articles";

export const dynamicParams = true;

const SITE_URL = "https://devis-fosse-septique.fr";
const SITE_NAME = "Devis Fosse Septique";

export async function generateStaticParams() {
  return getAllArticles(true).map((a) => ({ slug: a.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article introuvable" };

  const canonical = `${SITE_URL}/blog/${article.slug}`;
  const noIndex = article.draft === true;

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : undefined,
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonical,
      type: "article",
      locale: "fr_FR",
      siteName: SITE_NAME,
      ...(article.date ? { publishedTime: article.date } : {}),
      ...(article.image ? { images: [article.image] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

function readingTimeMinutes(md: string): number {
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

// ── Helpers ─────────────────────────────────────────────────────────

function extractText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object") {
    const n = node as { props?: { children?: unknown } };
    if (n.props && "children" in n.props) return extractText(n.props.children);
  }
  return "";
}

function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractTocItems(content: string): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      const label = match[1].replace(/[*_`]/g, "").trim();
      if (label) {
        items.push({ id: slugifyHeading(label), label });
      }
    }
  }
  return items;
}

// ── Custom markdown components ──────────────────────────────────────

const components: Components = {
  h2: ({ children, ...props }) => (
    <h2 {...props} className="heading-accent font-heading">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => {
    const text = extractText(children);
    const match = text.match(/^Étape\s+(\d+)\s*[:\-–—.]?\s*(.*)$/i);
    if (match) {
      const [, num, rest] = match;
      return (
        <h3 {...props} className="font-heading flex items-center">
          <span className="inline-flex items-center justify-center size-8 rounded-full bg-teal-100 text-teal-700 text-sm font-bold mr-3 shrink-0">
            {num}
          </span>
          <span>{rest || `Étape ${num}`}</span>
        </h3>
      );
    }
    return (
      <h3 {...props} className="font-heading">
        {children}
      </h3>
    );
  },
  blockquote: ({ children, ...props }) => {
    const text = extractText(children).trim();
    if (text.startsWith("⚠️") || text.startsWith("⚠")) {
      return (
        <blockquote
          {...props}
          className="not-prose my-6 border-l-4 border-amber-400 bg-amber-50 text-amber-900 px-6 py-4 rounded-r-lg"
        >
          {children}
        </blockquote>
      );
    }
    if (text.startsWith("📖")) {
      return (
        <blockquote
          {...props}
          className="not-prose my-6 border-l-4 border-teal-500 bg-teal-50 text-teal-900 px-6 py-4 rounded-r-lg italic"
        >
          {children}
        </blockquote>
      );
    }
    return (
      <blockquote
        {...props}
        className="border-l-4 border-teal-500 bg-teal-50/50 px-6 py-4 rounded-r-lg not-italic text-gray-700 font-normal"
      >
        {children}
      </blockquote>
    );
  },
  a: ({ href, children, ...props }) => {
    const url = href || "";
    const isExternal = url.startsWith("http") && !url.includes(SITE_URL.replace(/^https?:\/\//, ""));
    if (isExternal) {
      return (
        <a
          {...props}
          href={url}
          target="_blank"
          rel="noopener"
          className="text-teal-600 no-underline hover:underline font-medium"
        >
          {children}
        </a>
      );
    }
    return (
      <a
        {...props}
        href={url}
        className="text-teal-600 no-underline hover:underline font-medium"
      >
        {children}
      </a>
    );
  },
  table: ({ children, ...props }) => (
    <div className="not-prose my-8 overflow-x-auto rounded-lg border border-[#E8E6E3]">
      <table {...props} className="w-full border-collapse text-left">
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead {...props} className="bg-teal-50">
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      {...props}
      className="px-4 py-3 text-teal-700 font-semibold uppercase tracking-wider text-xs border-b border-[#E8E6E3]"
    >
      {children}
    </th>
  ),
  tr: ({ children, ...props }) => (
    <tr {...props} className="table-row-hover border-t border-[#E8E6E3]">
      {children}
    </tr>
  ),
  td: ({ children, ...props }) => {
    const text = extractText(children).trim();
    if (text === "✅") {
      return (
        <td {...props} className="px-4 py-3 text-green-600 text-xl text-center">
          ✅
        </td>
      );
    }
    if (text === "❌") {
      return (
        <td {...props} className="px-4 py-3 text-red-500 text-xl text-center">
          ❌
        </td>
      );
    }
    return (
      <td {...props} className="px-4 py-3 text-gray-700 align-top">
        {children}
      </td>
    );
  },
  ul: ({ children, ...props }) => {
    const arr = Array.isArray(children) ? children : [children];
    const hasMarkers = arr.some((child) => {
      const t = extractText(child).trim();
      return t.startsWith("✅") || t.startsWith("❌");
    });
    if (hasMarkers) {
      return (
        <ul {...props} className="not-prose my-6 space-y-2 list-none pl-0">
          {children}
        </ul>
      );
    }
    return <ul {...props}>{children}</ul>;
  },
  li: ({ children, ...props }) => {
    const text = extractText(children).trim();
    if (text.startsWith("✅")) {
      return (
        <li
          {...props}
          className="flex items-start gap-3 text-gray-700 leading-relaxed"
        >
          <span className="text-green-600 text-lg shrink-0 leading-tight">
            ✅
          </span>
          <span className="flex-1">
            {stripLeadingEmoji(children, "✅") as ReactNode}
          </span>
        </li>
      );
    }
    if (text.startsWith("❌")) {
      return (
        <li
          {...props}
          className="flex items-start gap-3 text-gray-700 leading-relaxed"
        >
          <span className="text-red-500 text-lg shrink-0 leading-tight">
            ❌
          </span>
          <span className="flex-1">
            {stripLeadingEmoji(children, "❌") as ReactNode}
          </span>
        </li>
      );
    }
    return <li {...props}>{children}</li>;
  },
};

function stripLeadingEmoji(children: unknown, emoji: string): unknown {
  if (typeof children === "string") {
    return children.replace(new RegExp(`^\\s*${emoji}\\s*`), "");
  }
  if (Array.isArray(children)) {
    const copy = [...children];
    for (let i = 0; i < copy.length; i++) {
      const t = extractText(copy[i]);
      if (t.trim().length === 0) continue;
      copy[i] = stripLeadingEmoji(copy[i], emoji) as typeof copy[number];
      return copy;
    }
    return copy;
  }
  if (children && typeof children === "object") {
    const el = children as {
      props?: { children?: unknown };
      type?: unknown;
    };
    if (el.props && "children" in el.props) {
      return children;
    }
  }
  return children;
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const mins = readingTimeMinutes(article.content);
  const readingLabel = article.readingTime ?? `${mins} min`;
  const tocItems = extractTocItems(article.content);
  const hasFaqs = !!(article.faqs && article.faqs.length > 0);
  const publishedDate = article.date ?? new Date().toISOString().slice(0, 10);

  // JSON-LD
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: `${SITE_URL}/blog/${slug}`,
      },
    ],
  };
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description ?? "",
    datePublished: publishedDate,
    dateModified: publishedDate,
    author: article.author
      ? { "@type": "Person", name: article.author }
      : { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
    ...(article.image ? { image: article.image } : {}),
  };
  const faqLd = hasFaqs
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: article.faqs!.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.reponse,
          },
        })),
      }
    : null;

  return (
    <div className="bg-white min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {article.draft && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Brouillon — cette page n&apos;est pas indexée par les moteurs de
            recherche.
          </div>
        </div>
      )}

      {/* Hero branded */}
      <section className="bg-teal-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <nav className="text-sm text-teal-100 mb-6">
            <Link href="/" className="hover:text-white transition-colors duration-200">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <Link href="/blog" className="hover:text-white transition-colors duration-200">
              Blog
            </Link>
            <span className="mx-2">/</span>
            <span className="text-teal-50">{article.title}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-heading font-extrabold text-white leading-[1.15] mb-4">
            {article.title}
          </h1>
          {article.description && (
            <p className="text-base sm:text-lg text-teal-50 max-w-3xl leading-relaxed mb-4">
              {article.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-4 text-sm text-teal-100 flex-wrap">
            {article.category && (
              <span className="bg-teal-900/40 text-teal-50 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                {article.category}
              </span>
            )}
            {article.date && (
              <>
                {article.category && (
                  <span className="w-1 h-1 rounded-full bg-teal-200/50" />
                )}
                <time dateTime={article.date}>
                  {new Date(article.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-teal-200/50" />
            <span>{readingLabel} de lecture</span>
            {article.author && (
              <>
                <span className="w-1 h-1 rounded-full bg-teal-200/50" />
                <span>Par {article.author}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2-column layout: article + sticky TOC */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex gap-12">
          <article className="flex-1 min-w-0">
            {/* Points clés */}
            {article.keyPoints && article.keyPoints.length > 0 && (
              <div className="not-prose bg-teal-50 border border-teal-100 rounded-xl p-6 mb-10">
                <p className="font-bold text-gray-900 text-base mb-3">
                  Points clés à retenir
                </p>
                <ul className="text-sm text-gray-700 leading-relaxed space-y-2">
                  {article.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-teal-700 font-bold mt-0.5 flex-shrink-0">
                        {i + 1}.
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className="
                prose prose-lg max-w-none
                prose-headings:font-heading prose-headings:text-gray-900 prose-headings:tracking-tight
                prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:scroll-mt-20
                prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:scroll-mt-20
                prose-p:text-gray-600 prose-p:leading-[1.8]
                prose-strong:text-gray-900
                prose-code:bg-gray-100 prose-code:text-teal-700 prose-code:px-1.5 prose-code:py-0.5
                prose-code:rounded prose-code:text-sm prose-code:before:hidden prose-code:after:hidden
                prose-ul:text-gray-600 prose-ol:text-gray-600
                prose-li:marker:text-teal-500
                prose-hr:border-[#E8E6E3] prose-hr:my-12
                prose-img:rounded-xl prose-img:shadow-sm
              "
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug]}
                components={components}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            {/* FAQ accordion */}
            {hasFaqs && (
              <section id="faq" className="scroll-mt-24 mt-12">
                <h2 className="font-heading text-2xl sm:text-3xl text-gray-900 mb-6">
                  Questions fréquentes
                </h2>
                <div className="space-y-3">
                  {article.faqs!.map((faq, i) => (
                    <details
                      key={i}
                      className="group border border-[#E8E6E3] rounded-xl overflow-hidden bg-white"
                    >
                      <summary className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 transition-colors duration-200 text-gray-900 font-semibold text-base">
                        {faq.question}
                        <svg
                          className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-300 flex-shrink-0 ml-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4">
                        <p className="text-base text-gray-600 leading-relaxed">
                          {faq.reponse}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Sticky TOC (desktop) */}
          {tocItems.length > 0 && (
            <aside className="hidden xl:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Sommaire
                </p>
                <ul className="space-y-2 text-sm">
                  {tocItems.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-gray-600 hover:text-teal-700 transition-colors leading-snug block"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
