"use client";

import { ITestStatus } from "@/types";

interface LegendProps {
  status: ITestStatus;
}

export function Legend({ status }: LegendProps) {
  const {
    notVisited,
    notAnswered,
    answered,
    markedForReview,
    answeredAndMarkedForReview,
  } = status;

  return (
    <div className="border-dotted border-[3px] border-black p-2 mb-4 w-full flex flex-wrap">
      <div className="flex items-center justify-start min-w-[150px] min-h-[40px]">
        <span className="flex items-center justify-center p-[5px] bg-[#d0d0d7] border border-black rounded-[5px] min-w-[30px] text-center text-sm">
          {notVisited.length}
        </span>
        <span className="ml-[10px] text-sm">Not Visited</span>
      </div>

      <div className="flex items-center justify-start min-w-[150px] min-h-[40px]">
        <div
          className="h-[30px] w-[30px] bg-red-500 flex items-center justify-center p-[5px] text-white text-sm"
          style={{ clipPath: "polygon(0 0, 100% 25%, 100% 76%, 0% 100%)" }}
        >
          {notAnswered.length}
        </div>
        <span className="ml-[10px] text-sm">Not Answered</span>
      </div>

      <div className="flex items-center justify-start min-w-[150px] min-h-[40px]">
        <div
          className="h-[30px] w-[30px] bg-green-500 flex items-center justify-center p-[5px] text-white text-sm"
          style={{ clipPath: "polygon(0 0, 100% 25%, 100% 76%, 0% 100%)" }}
        >
          {answered.length}
        </div>
        <span className="ml-[10px] text-sm">Answered</span>
      </div>

      <div className="flex items-center justify-start min-w-[150px] min-h-[40px]">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center p-[5px_7px] text-white text-sm"
          style={{ background: "linear-gradient(129deg, rgba(131, 96, 187, 1) 0%, rgba(77, 32, 146, 1) 100%)" }}
        >
          {markedForReview.length}
        </div>
        <span className="ml-[10px] text-sm">Marked for Review</span>
      </div>

      <div className="flex items-center justify-start min-w-[150px] min-h-[40px] flex-[2]">
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center p-[10px] text-white text-sm relative"
          style={{ background: "linear-gradient(129deg, rgba(131, 96, 187, 1) 0%, rgba(77, 32, 146, 1) 100%)" }}
        >
          {answeredAndMarkedForReview.length}
          <span className="absolute bottom-0 right-0 mb-[2px] mr-[3px] w-[10px] h-[10px] rounded-full bg-green-500"></span>
        </div>
        <span className="ml-[10px] text-sm">
          Answered &amp; Marked for Review (will be considered for evaluation)
        </span>
      </div>
    </div>
  );
}
