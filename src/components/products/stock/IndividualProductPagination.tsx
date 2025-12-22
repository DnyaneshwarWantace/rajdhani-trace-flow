import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface IndividualProductPaginationProps {
  totalProducts: number;
  currentPage: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export default function IndividualProductPagination({
  totalProducts,
  currentPage,
  limit,
  onPageChange,
  onLimitChange,
}: IndividualProductPaginationProps) {
  if (totalProducts === 0) return null;

  const totalPages = Math.ceil(totalProducts / limit);

  const pages: (number | 'ellipsis')[] = [];

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  }

  return (
    <div className="mt-4 sm:mt-6 w-full">
      <Pagination className="w-full">
        <PaginationContent className="w-full justify-center flex-wrap gap-1">
          <PaginationItem>
            <PaginationPrevious
              onClick={() => {
                if (currentPage > 1) {
                  onPageChange(currentPage - 1);
                }
              }}
              className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
            />
          </PaginationItem>

          {/* Page Numbers - Hide some on mobile */}
          {pages.map((page, index) => (
            <PaginationItem key={index} className={page === 'ellipsis' ? 'hidden sm:block' : ''}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => onPageChange(page as number)}
                  className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                    // On mobile, only show current page and adjacent pages
                    Math.abs((page as number) - currentPage) > 1 && (page as number) !== 1 && (page as number) !== totalPages
                      ? 'hidden sm:flex'
                      : ''
                  }`}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => {
                if (currentPage < totalPages) {
                  onPageChange(currentPage + 1);
                }
              }}
              className={`${currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Pagination Info and Limit Selector */}
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
          Showing {(currentPage - 1) * limit + 1} to{' '}
          {Math.min(currentPage * limit, totalProducts)} of {totalProducts} products
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
          <Select value={limit.toString()} onValueChange={(value) => onLimitChange(parseInt(value))}>
            <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

