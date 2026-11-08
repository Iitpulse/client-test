// Batch 8 Student-AssignedPractice: practice sets a teacher assigned (api-tests docs/batch8-api.md "Assigned practice").
// A started assignment is an ordinary M4 practice set, answered on /practice/[setId].
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m4Keys } from "./m4-api";
import { request } from "./student-api";
import type { StartAssignmentResponse, StudentAssignmentsResponse } from "@/types/assignments";
import { normalizePracticeSet } from "@/types/practice-m6";

const enc = encodeURIComponent;

export const assignmentsApi = {
  /** GET /tests/student/assignments */
  list: (signal?: AbortSignal) => request<StudentAssignmentsResponse>("tests", "/student/assignments", undefined, signal),
  /** POST /tests/student/assignments/:id/start: the set is picked the first time, the same set after */
  start: (id: string) => request<StartAssignmentResponse>("tests", `/student/assignments/${enc(id)}/start`, undefined, undefined, {}),
};

export const assignmentKeys = { list: ["student", "assignments"] as const };

export function useAssignments(enabled = true) {
  return useQuery({ queryKey: assignmentKeys.list, queryFn: ({ signal }) => assignmentsApi.list(signal), enabled, staleTime: 60_000 });
}

/** "Start practice" / "Continue" / "Finish it": start (or reopen) the assignment's set and open it. */
export function useStartAssignment() {
  const router = useRouter();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assignmentsApi.start(id),
    onSuccess: (res) => {
      // the set page loads it with the server's clock (a timed drill's timer runs on it)
      const set = normalizePracticeSet(res.set);
      client.invalidateQueries({ queryKey: m4Keys.practice(set.id) });
      client.invalidateQueries({ queryKey: assignmentKeys.list });
      router.push(`/practice/${enc(set.id)}`);
    },
  });
}
