import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  label?: string;
  /** If true, wraps in a rounded footer bar (for tables). Default: true */
  tableFooter?: boolean;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (currentPage > 3) pages.push("...");
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (currentPage < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  label = "items",
  tableFooter = true,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);
  const pages = getPageNumbers(currentPage, totalPages);

  const content = (
    <div className="flex items-center justify-between">
      <p className="text-xs text-[#94a3b8]">
        Showing{" "}
        <span className="text-[#1a1a2e]">{from}–{to}</span>{" "}
        of <span className="text-[#1a1a2e]">{totalItems}</span> {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((pg, i) =>
          pg === "..." ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-[#94a3b8] text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={pg}
              onClick={() => onPageChange(pg as number)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                currentPage === pg
                  ? "bg-[#2F6BFF] text-white"
                  : "text-[#64748b] hover:bg-[#e2e8f0]"
              }`}
            >
              {pg}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:bg-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  if (tableFooter) {
    return (
      <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8f9fc]">
        {content}
      </div>
    );
  }

  return <div className="mt-6">{content}</div>;
}
