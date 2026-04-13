import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Clock, Tag, ArrowRight, Calendar } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { getBlogPosts, type BlogPost } from "../utils/blogStorage";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

/** Sanitize HTML to prevent XSS — strips script tags, event handlers, and dangerous protocols */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>.*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*\/?>/gi, "")
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "")
    .replace(/vbscript\s*:/gi, "");
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

// ── Fallback auto-generated content when no body is written ──────────────────

function generateContent(title: string): string {
  return `The influencer marketing landscape continues to evolve rapidly, and staying ahead of the curve requires a deep understanding of the latest strategies and best practices. In this comprehensive guide, we explore the key aspects of ${title.toLowerCase()} and how you can leverage them for maximum impact.

## Understanding the Fundamentals

Before diving into advanced strategies, it's crucial to establish a solid foundation. Influencer marketing isn't just about finding someone with a large following — it's about finding the right person whose audience aligns with your brand values and target demographic.

The most successful campaigns start with clear objectives. Whether you're looking to increase brand awareness, drive sales, or build community engagement, having defined goals will guide every decision in your campaign strategy.

## Key Strategies for Success

**1. Authenticity is Non-Negotiable**
Today's audiences can spot inauthentic content from a mile away. The most effective influencer partnerships are those where the creator genuinely believes in the product or service they're promoting. This authenticity translates into higher engagement rates and better conversion.

**2. Micro-Influencers Deliver Results**
While mega-influencers offer massive reach, micro-influencers (10K–100K followers) often deliver superior engagement rates. Their audiences tend to be more niche and trusting, resulting in higher quality interactions and conversions.

**3. Data-Driven Decision Making**
Leverage analytics to identify the right influencers, track campaign performance, and optimize your strategy. Metrics like engagement rate, audience demographics, and conversion tracking are essential for measuring ROI.

## Best Practices

When implementing your influencer marketing strategy, keep these best practices in mind:

- **Set clear deliverables**: Be specific about what you expect from each collaboration, including content type, posting schedule, and key messaging.
- **Allow creative freedom**: While guidelines are important, give influencers the creative freedom to present your brand in their authentic voice.
- **Build long-term relationships**: One-off campaigns can work, but sustained partnerships build deeper brand association and trust with the audience.
- **Track and measure**: Use UTM parameters, promo codes, and analytics dashboards to measure the impact of each campaign.

## Looking Ahead

The future of influencer marketing is bright, with emerging technologies like AI-powered matching, virtual influencers, and enhanced analytics tools continuing to reshape the industry. Brands that stay adaptable and prioritize authentic connections will be best positioned for success.

As the industry matures, we can expect to see more standardized pricing models, better tools for measuring ROI, and increasingly sophisticated audience targeting capabilities. Platforms like Flubn are at the forefront of these innovations, making it easier than ever for brands and creators to connect and collaborate effectively.`;
}

// ── Markdown-lite renderer ──────────────────────────────────────────────────

function renderBody(raw: string) {
  const lines = raw.split("\n");
  const nodes: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletBuffer.length === 0) return;
    nodes.push(
      <ul key={`ul-${key}`} className="list-none space-y-2 ml-0">
        {bulletBuffer.map((line, j) => (
          <li key={j} className="flex items-start gap-2 text-[#64748b] leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF] mt-2.5 shrink-0" />
            <span
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(line
                  .replace(/^-\s*/, "")
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1a1a2e]">$1</strong>')),
              }}
            />
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushBullets(String(i));
      nodes.push(
        <h2 key={i} className="text-xl text-[#1a1a2e] mt-8 mb-4 pt-2 border-t border-[#f1f5f9]">
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      flushBullets(String(i));
      nodes.push(
        <h1 key={i} className="text-2xl text-[#1a1a2e] mt-6 mb-4">
          {line.replace("# ", "")}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      bulletBuffer.push(line);
    } else if (line.trim() === "") {
      flushBullets(String(i));
    } else {
      flushBullets(String(i));
      nodes.push(
        <p
          key={i}
          className="text-[#64748b] leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(line
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1a1a2e]">$1</strong>')
              .replace(/\n/g, "<br/>")),
          }}
        />
      );
    }
  });
  flushBullets("end");
  return nodes;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const posts = getBlogPosts();
    const found = posts.find((p) => p.id === id) ?? null;
    setPost(found);
    setRelatedPosts(posts.filter((p) => p.id !== id).slice(0, 3));
  }, [id]);

  // Loading state
  if (post === undefined) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2F6BFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not found
  if (!post) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] font-['Inter',sans-serif]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl text-[#1a1a2e]">Article Not Found</h1>
          <p className="text-[#64748b] mt-2">This article doesn't exist or has been removed.</p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Use saved content or fall back to auto-generated
  const bodyText = post.content?.trim() ? post.content : generateContent(post.title);
  const bodyNodes = renderBody(bodyText);

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-['Inter',sans-serif]">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#EBF2FF] via-white to-[#f0f9ff] py-10 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-[#2F6BFF] text-sm hover:gap-2.5 transition-all mb-6"
            >
              <ArrowLeft size={16} />
              Back to Blog
            </button>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-[#EBF2FF] text-[#2F6BFF] rounded-full text-xs flex items-center gap-1">
                <Tag size={12} />
                {post.category}
              </span>
              <span className="text-[#94a3b8] text-sm flex items-center gap-1">
                <Clock size={14} /> {post.readTime}
              </span>
              <span className="text-[#94a3b8] text-sm flex items-center gap-1">
                <Calendar size={14} /> {post.date}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-[#1a1a2e] !leading-tight">
              {post.title}
            </h1>

            <p className="text-[#64748b] mt-4 text-lg max-w-2xl">{post.excerpt}</p>

            <div className="flex items-center gap-3 mt-6">
              <div
                className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, #0F3D91 0%, #2F6BFF 100%)" }}
              >
                {post.author.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="text-[#1a1a2e] text-sm">{post.author}</p>
                <p className="text-xs text-[#94a3b8]">{post.date}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Image */}
      {post.image && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl overflow-hidden shadow-lg"
          >
            <ImageWithFallback
              src={post.image}
              alt={post.title}
              className="w-full aspect-video object-cover"
            />
          </motion.div>
        </div>
      )}

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-[#e2e8f0] p-8 lg:p-12"
        >
          <div className="space-y-5">
            {bodyNodes}
          </div>
        </motion.div>

        {/* Tags & Share */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-8 p-6 bg-white rounded-2xl border border-[#e2e8f0]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[#64748b]">Tags:</span>
            {["Influencer Marketing", post.category, "Strategy"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-[#f8f9fc] text-[#64748b] rounded-full text-xs border border-[#e2e8f0]"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#64748b]">Share:</span>
            {["Twitter", "LinkedIn", "Facebook"].map((platform) => (
              <button
                key={platform}
                className="px-3 py-1.5 bg-[#EBF2FF] text-[#2F6BFF] rounded-lg text-xs hover:bg-[#2F6BFF] hover:text-white transition-colors"
              >
                {platform}
              </button>
            ))}
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-2xl text-[#1a1a2e] mb-8">Related Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.id}
                to={`/blog/${rp.id}`}
                className="bg-white rounded-2xl overflow-hidden border border-[#e2e8f0] hover:shadow-lg transition-all group hover:-translate-y-1"
              >
                <div className="aspect-video overflow-hidden">
                  <ImageWithFallback
                    src={rp.image}
                    alt={rp.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-[#EBF2FF] text-[#2F6BFF] rounded-full text-xs">{rp.category}</span>
                    <span className="text-[#94a3b8] text-xs flex items-center gap-1">
                      <Clock size={12} /> {rp.readTime}
                    </span>
                  </div>
                  <h3 className="text-[#1a1a2e] group-hover:text-[#2F6BFF] transition-colors">{rp.title}</h3>
                  <p className="text-[#64748b] text-sm mt-2 line-clamp-2">{rp.excerpt}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#e2e8f0]">
                    <span className="text-xs text-[#94a3b8]">{rp.date}</span>
                    <span className="text-[#2F6BFF] text-sm flex items-center gap-1">
                      Read <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ========== GRADIENT FOOTER WRAPPER ========== */}
      <section className="px-5 pb-0">
        <div className="rounded-t-[8px] p-[5px] pt-[5px]" style={{ background: "linear-gradient(180deg, #0F3D91 0%, #2F6BFF 60%, #6BA9FF 100%)" }}>
          <div className="bg-[#0a090f] rounded-t-0">
            <Footer />
          </div>
        </div>
      </section>
    </div>
  );
}