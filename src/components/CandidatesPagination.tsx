import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CandidatesPaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  handlePageChange: (page: number) => void;
}

const CandidatesPagination = ({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  handlePageChange,
}: CandidatesPaginationProps) => {
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        className="border-slate-600 text-white hover:bg-slate-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      {getPageNumbers().map((pageNumber, index) => (
        <div key={index}>
          {pageNumber === '...' ? (
            <span className="px-3 py-2 text-slate-400">...</span>
          ) : (
            <Button
              variant={currentPage === pageNumber ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(pageNumber as number)}
              className={
                currentPage === pageNumber
                  ? "bg-secondary-pink hover:bg-secondary-pink/80"
                  : "border-slate-600 text-white hover:bg-slate-700"
              }
            >
              {pageNumber}
            </Button>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="border-slate-600 text-white hover:bg-slate-700"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default CandidatesPagination;