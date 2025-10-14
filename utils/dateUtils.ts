import { format, isToday, isYesterday, isThisWeek, isThisYear, isSameDay } from 'date-fns';

/**
 * Format timestamp for chat messages with smart date/time display
 */
export function formatChatTimestamp(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    // Today: show only time (e.g., "2:30 PM")
    return format(dateObj, 'h:mm a');
  } else if (isYesterday(dateObj)) {
    // Yesterday: show "Yesterday 2:30 PM"
    return `Yesterday ${format(dateObj, 'h:mm a')}`;
  } else if (isThisWeek(dateObj)) {
    // This week: show day and time (e.g., "Mon 2:30 PM")
    return format(dateObj, 'EEE h:mm a');
  } else if (isThisYear(dateObj)) {
    // This year: show month, day and time (e.g., "Mar 15 2:30 PM")
    return format(dateObj, 'MMM d h:mm a');
  } else {
    // Other years: show full date and time (e.g., "Mar 15, 2023 2:30 PM")
    return format(dateObj, 'MMM d, yyyy h:mm a');
  }
}

/**
 * Check if two dates are on different days (used for date separators)
 */
export function isDifferentDay(date1: Date | string, date2: Date | string): boolean {
  const dateObj1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const dateObj2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  return !isSameDay(dateObj1, dateObj2);
}

/**
 * Format timestamp for conversation list (more compact)
 */
export function formatConversationTimestamp(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    // Today: show only time
    return format(dateObj, 'h:mm a');
  } else if (isYesterday(dateObj)) {
    // Yesterday: show "Yesterday"
    return 'Yesterday';
  } else if (isThisWeek(dateObj)) {
    // This week: show day name
    return format(dateObj, 'EEEE');
  } else if (isThisYear(dateObj)) {
    // This year: show month and day
    return format(dateObj, 'MMM d');
  } else {
    // Other years: show month, day and year
    return format(dateObj, 'MMM d, yyyy');
  }
}

/**
 * Get a readable date for date separators
 */
export function getDateSeparatorText(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return 'Today';
  } else if (isYesterday(dateObj)) {
    return 'Yesterday';
  } else if (isThisYear(dateObj)) {
    return format(dateObj, 'EEEE, MMMM d'); // e.g., "Monday, March 15"
  } else {
    return format(dateObj, 'EEEE, MMMM d, yyyy'); // e.g., "Monday, March 15, 2023"
  }
}

/**
 * Format timestamp for notifications with smart date/time display (no seconds)
 */
export function formatNotificationTimestamp(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    // Today: show "Today" and time without seconds (e.g., "Today 2:30 PM")
    return `Today ${format(dateObj, 'h:mm a')}`;
  } else if (isYesterday(dateObj)) {
    // Yesterday: show "Yesterday" and time without seconds (e.g., "Yesterday 2:30 PM")
    return `Yesterday ${format(dateObj, 'h:mm a')}`;
  } else if (isThisYear(dateObj)) {
    // This year: show month, day and time without seconds (e.g., "Mar 15 2:30 PM")
    return format(dateObj, 'MMM d, h:mm a');
  } else {
    // Other years: show full date and time without seconds (e.g., "Mar 15, 2023 2:30 PM")
    return format(dateObj, 'MMM d, yyyy h:mm a');
  }
}