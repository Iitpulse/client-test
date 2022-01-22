export interface IStatus {
  status: string;
  visitedAt: string | null;
  answeredAt: string | null;
  answeredAndMarkedForReviewAt: string | null;
  markedForReviewAt: string | null;
}

export interface IOption {
  id: string | number;
  value: string;
}
