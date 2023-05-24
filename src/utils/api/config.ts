import axios from "axios";
import { AUTH_TOKEN } from "../constants";

export const API_QUESTIONS = () =>
  axios.create({
    baseURL: `${process.env.REACT_APP_QUESTIONS_API}`,
    headers: {
      authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN)}`,
    },
  });

export const API_USERS = () =>
  axios.create({
    baseURL: `${process.env.REACT_APP_USERS_API}`,
    headers: {
      authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN)}`,
    },
  });

export const API_TESTS = () =>
  axios.create({
    baseURL: `${process.env.REACT_APP_TESTS_API}`,
    headers: {
      authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN)}`,
    },
  });
