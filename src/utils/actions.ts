import { ITest } from "./interfaces";

export enum TEST_ACTION_TYPES {
  NEXT_QUESTION = "NEXT_QUESTION",
  PREVIOUS_QUESTION = "PREVIOUS_QUESTION",
  MARK_FOR_ANSWERED = "MARK_FOR_ANSWERED",
  SAVE_AND_NEXT = "SAVE_AND_NEXT",
  MARK_FOR_REVIEW_AND_NEXT = "MARK_FOR_REVIEW_AND_NEXT",
  SAVE_AND_MARK_FOR_REVIEW = "SAVE_AND_MARK_FOR_REVIEW",
  MARK_FOR_NOT_ANSWERED = "MARK_FOR_NOT_ANSWERED",
  GO_TO_QUESTION = "GO_TO_QUESTION",
  SHUFFLE_QUESTIONS = "SHUFFLE_QUESTIONS",
  FLATTEN_QUESTIONS = "FLATTEN_QUESTIONS",
  INITIALIZE_QUESTIONS = "INITIALIZE_QUESTIONS",
  CLEAR_SELECTION = "CLEAR_SELECTION",
}

export interface TEST_ACTION {
  type: TEST_ACTION_TYPES;
  payload: number | ITest | any; // index of question
}
