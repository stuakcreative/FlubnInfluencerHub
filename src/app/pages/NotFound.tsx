import { Link } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-4 font-['Inter',sans-serif]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-9xl text-[#2F6BFF]/10 mb-6">404</div>
        <h1 className="text-3xl text-[#1a1a2e]">Page Not Found</h1>
        <p className="text-[#64748b] mt-3 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2F6BFF] text-white rounded-xl hover:bg-[#0F3D91] transition-colors shadow-lg shadow-[#2F6BFF]/25"
          >
            <Home size={16} />
            Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}