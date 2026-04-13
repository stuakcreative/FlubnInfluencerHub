import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Clock, ArrowRight, Tag, BookOpen } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { getBlogPosts, type BlogPost } from "../utils/blogStorage";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Pagination } from "../components/Pagination";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    setPosts(getBlogPosts());
  }, []);

  // Derive categories dynamically from live posts, with "All" first
  const BASE_CATEGORIES = ["Strategy", "Trends", "Tips", "Analytics", "Growth"];
  const blogCategories = [
    "All",
    ...Array.from(
      new Set([...BASE_CATEGORIES, ...posts.map((p) => p.category).filter(Boolean)])
    ),
  ];

  const featured = posts.find((p) => p.featured);
  const filtered = activeCategory === "All"
    ? posts.filter((p) => !p.featured)
    : posts.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());

  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 9;
  useEffect(() => { setCurrentPage(1); }, [activeCategory]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const pagedPosts = filtered.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-['Inter',sans-serif]">
      <Navbar />

      {/* Header */}
      <section className="px-5 sm:px-8 lg:px-[100px] pt-8">
        <div className="relative overflow-hidden bg-[#0a090f] rounded-[30px] sm:rounded-[50px]">
          <div className="absolute inset-0">
            <div
              className="absolute top-0 right-0 w-[60%] h-full opacity-40"
              style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(47,107,255,0.5), transparent 60%)" }}
            />
            <div
              className="absolute bottom-0 left-[20%] w-[40%] h-[60%] opacity-25"
              style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(107,169,255,0.4), transparent 70%)" }}
            />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-8 sm:px-12 lg:px-[80px] py-20 lg:py-32 text-center">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 px-4 py-1.5 rounded-full text-sm mb-6 border border-white/10">
                <BookOpen size={14} className="text-[#6BA9FF]" />
                Blog
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-white text-[42px] sm:text-[56px] lg:text-[72px] !leading-[1] tracking-[-2px]">
                Insights &{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #2F6BFF 0%, #6BA9FF 100%)" }}>
                  Resources
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-white/50 text-[17px] leading-[28px] mt-6 max-w-[560px] mx-auto">
                Expert advice, trends, and tips for brands and creators in the influencer marketing space.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-10">
          {blogCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                activeCategory === cat
                  ? "bg-[#2F6BFF] text-white shadow-sm"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:border-[#2F6BFF]/30 hover:text-[#2F6BFF]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Article */}
        {featured && activeCategory === "All" && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="bg-white rounded-2xl overflow-hidden border border-[#e2e8f0] mb-10 hover:shadow-lg transition-shadow group"
          >
            <Link to={`/blog/${featured.id}`} className="grid md:grid-cols-2">
              <div className="aspect-video md:aspect-auto overflow-hidden">
                <ImageWithFallback
                  src={featured.image}
                  alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-[#EBF2FF] text-[#2F6BFF] rounded-full text-xs">
                    {featured.category}
                  </span>
                  <span className="text-[#94a3b8] text-sm flex items-center gap-1">
                    <Clock size={14} /> {featured.readTime}
                  </span>
                </div>
                <h2 className="text-2xl text-[#1a1a2e] group-hover:text-[#2F6BFF] transition-colors">
                  {featured.title}
                </h2>
                <p className="text-[#64748b] mt-3">{featured.excerpt}</p>
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-[#94a3b8]">
                    {featured.author} &middot; {featured.date}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#2F6BFF] text-sm group-hover:gap-2 transition-all">
                    Read More <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Blog Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pagedPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl overflow-hidden border border-[#e2e8f0] hover:shadow-lg transition-all group hover:-translate-y-1"
            >
              <Link to={`/blog/${post.id}`}>
                <div className="aspect-video overflow-hidden">
                  <ImageWithFallback
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 bg-[#EBF2FF] text-[#2F6BFF] rounded-full text-xs">
                      {post.category}
                    </span>
                    <span className="text-[#94a3b8] text-xs flex items-center gap-1">
                      <Clock size={12} /> {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-[#1a1a2e] group-hover:text-[#2F6BFF] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-[#64748b] text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#e2e8f0]">
                    <span className="text-xs text-[#94a3b8]">{post.date}</span>
                    <span className="text-[#2F6BFF] text-sm flex items-center gap-1">
                      Read <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#94a3b8]">
            <Tag size={40} className="mx-auto mb-4 opacity-50" />
            <p>No articles found in this category yet.</p>
          </div>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={POSTS_PER_PAGE} onPageChange={setCurrentPage} label="posts" tableFooter={false} />
      </div>

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