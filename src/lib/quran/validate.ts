"use server";

import { RateLimitResult } from "@/lib/app/rate-limit";

/**
 * Validates surah number: must be an integer 1 to 114.
 * Returns true if valid, throws if invalid.
 */
export function validateSurah(surah: unknown): surah is number {
  if (typeof surah !== "number" || !Number.isInteger(surah)) {
    throw new Error("Invalid surah. Must be an integer between 1 and 114.");
  }
  if (surah < 1 || surah > 114) {
    throw new Error("Invalid surah. Must be an integer between 1 and 114.");
  }
  return true;
}

/**
 * Validates ayah number: must be a positive integer.
 * Returns true if valid, throws if invalid.
 */
export function validateAyah(ayah: unknown): ayah is number {
  if (typeof ayah !== "number" || !Number.isInteger(ayah)) {
    throw new Error("Invalid ayah number. Must be a positive integer.");
  }
  if (ayah < 1) {
    throw new Error("Invalid ayah number. Must be a positive integer.");
  }
  return true;
}

/**
 * Validates reciter ID: must be a positive integer.
 * Returns true if valid, throws if invalid.
 */
export function validateReciter(reciter: unknown): reciter is number {
  if (typeof reciter !== "number" || !Number.isInteger(reciter)) {
    throw new Error("Invalid reciter. Must be a positive integer.");
  }
  if (reciter < 1) {
    throw new Error("Invalid reciter. Must be a positive integer.");
  }
  return true;
}

/**
 * Validates translation ID: must be a positive integer.
 * Returns true if valid, throws if invalid.
 */
export function validateTranslationId(translationId: unknown): translationId is number {
  if (typeof translationId !== "number" || !Number.isInteger(translationId)) {
    throw new Error("Invalid translation ID. Must be a positive integer.");
  }
  if (translationId < 1) {
    throw new Error("Invalid translation ID. Must be a positive integer.");
  }
  return true;
}

/**
 * Validates and trims a search query: length 2 to 100 chars.
 * Returns true if valid, throws if invalid.
 */
export function validateSearchQuery(q: unknown): q is string {
  if (typeof q !== "string") {
    throw new Error("Invalid search query. Must be a string.");
  }
  const trimmed = q.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new Error("Search query must be between 2 and 100 characters (after trimming).");
  }
  return true;
}

/**
 * Validates a positive integer ID (used for translation/surah reciter etc.)
 * Returns true if valid, throws if invalid.
 */
export function validatePositiveInt(id: unknown): id is number {
  if (typeof id !== "number" || !Number.isInteger(id)) {
    throw new Error("Invalid ID. Must be a positive integer.");
  }
  if (id < 1) {
    throw new Error("Invalid ID. Must be a positive integer.");
  }
  return true;
}