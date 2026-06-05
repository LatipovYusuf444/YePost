import { ChevronLeft, ChevronRight } from "lucide-react";

type TablePaginationProps = {
  page: number;
  pageSize?: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

function getPageItems(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) return [1, 2, 3, "...", totalPages];
  if (page >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];

  return [1, "...", page, "...", totalPages];
}

export default function TablePagination({
  page,
  pageSize = 10,
  totalItems,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = getPageItems(safePage, totalPages);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-white px-4 py-3">
      <button
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
        aria-label="Oldingi sahifa"
      >
        <ChevronLeft size={16} />
      </button>

      {pageItems.map((item, index) =>
        item === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-8 w-8 items-center justify-center text-sm font-bold text-gray-400"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(Number(item))}
            className={[
              "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold transition",
              safePage === item
                ? "bg-orange-500 text-white shadow-sm shadow-orange-100"
                : "border border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:text-orange-600",
            ].join(" ")}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(safePage + 1)}
        disabled={safePage === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
        aria-label="Keyingi sahifa"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
