import axios from "axios";
import { AUTH_TOKEN } from "../constants";

const API_GATEWAY = (service: "users" | "questions" | "tests") =>
  axios.create({
    baseURL: `${process.env.REACT_APP_API_GATEWAY}${service}`,
    headers: {
      authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN)}`,
    },
  });

export const API_QUESTIONS = () => API_GATEWAY("questions");

export const API_USERS = () => API_GATEWAY("users");

export const API_TESTS = () => API_GATEWAY("tests");
