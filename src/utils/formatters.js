// src/utils/formatters.js - Formatting utilities for phone numbers, dates, etc.

/**
 * Format phone number to E.164 format for US numbers
 * Accepts various formats and converts to +1XXXXXXXXXX
 * Examples:
 *   5133560591 -> +15133560591
 *   513-356-0591 -> +15133560591
 *   (513) 356-0591 -> +15133560591
 *   +15133560591 -> +15133560591
 */
export function formatPhoneE164(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's already 11 digits starting with 1, just add +
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }

  // If it's 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it already starts with +1 and has 11 digits after the +, return as is
  if (phone.startsWith('+1') && digits.length === 11) {
    return phone;
  }

  // Otherwise, try to add +1 to whatever we have
  return `+1${digits}`;
}

/**
 * Format phone number for display: +1 (513) 356-0591
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return '';

  const e164 = formatPhoneE164(phone);
  const digits = e164.replace(/\D/g, '');

  // Format as +1 (XXX) XXX-XXXX
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // If format doesn't match, return original
  return phone;
}

/**
 * Format date to MM/DD/YYYY (removes time component)
 */
export function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
export function formatDateForInput(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
