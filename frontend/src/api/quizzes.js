import api from "./axios";

export function listQuizzesForCourse(courseId) {
  return api.get(`/courses/${courseId}/quizzes`).then((r) => r.data.data);
}

export function createQuiz(courseId, payload) {
  return api.post(`/courses/${courseId}/quizzes`, payload).then((r) => r.data.data);
}

export function getQuiz(quizId) {
  return api.get(`/quizzes/${quizId}`).then((r) => r.data.data);
}

export function setQuizPublished(quizId, isPublished) {
  return api.put(`/quizzes/${quizId}/publish`, { isPublished }).then((r) => r.data.data);
}

export function startOrResumeAttempt(quizId) {
  return api.post(`/quizzes/${quizId}/attempts`).then((r) => r.data.data);
}

export function getAttemptsForQuiz(quizId) {
  return api.get(`/quizzes/${quizId}/attempts`).then((r) => r.data.data);
}

export function autosaveAnswer(attemptId, questionId, selectedOptionIndex) {
  return api.put(`/attempts/${attemptId}/answers`, { questionId, selectedOptionIndex }).then((r) => r.data.data);
}

export function submitAttempt(attemptId) {
  return api.post(`/attempts/${attemptId}/submit`).then((r) => r.data.data);
}
