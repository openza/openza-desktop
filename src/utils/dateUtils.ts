/**
 * Formats a date string as a relative time (e.g., "2 days ago", "in 3 hours", "today")
 */
export const formatRelativeDate = (dateString: string): string => {
  try {
    // For date-only strings (YYYY-MM-DD), parse components directly to avoid timezone issues
    let date: Date;
    if (!dateString.includes('T')) {
      // Parse YYYY-MM-DD format directly without timezone conversion
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      // Handle full datetime strings
      date = new Date(dateString);
    }
    
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInSeconds = Math.round(diffInMs / 1000);
    const diffInMinutes = Math.round(diffInSeconds / 60);
    const diffInHours = Math.round(diffInMinutes / 60);
    const diffInDays = Math.round(diffInHours / 24);

    // Check if it's today
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    // Check if it's tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    // Handle special cases first
    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else if (isTomorrow) {
      return 'Tomorrow';
    }

    // Handle past dates
    if (diffInMs < 0) {
      const absDays = Math.abs(diffInDays);
      const absHours = Math.abs(diffInHours);
      const absMinutes = Math.abs(diffInMinutes);

      if (absDays > 7) {
        // More than a week ago - show actual date
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      } else if (absDays >= 1) {
        return `${absDays} day${absDays === 1 ? '' : 's'} ago`;
      } else if (absHours >= 1) {
        return `${absHours} hour${absHours === 1 ? '' : 's'} ago`;
      } else if (absMinutes >= 1) {
        return `${absMinutes} minute${absMinutes === 1 ? '' : 's'} ago`;
      } else {
        return 'Just now';
      }
    }

    // Handle future dates
    if (diffInDays > 7) {
      // More than a week away - show actual date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } else if (diffInDays >= 1) {
      return `In ${diffInDays} day${diffInDays === 1 ? '' : 's'}`;
    } else if (diffInHours >= 1) {
      return `In ${diffInHours} hour${diffInHours === 1 ? '' : 's'}`;
    } else if (diffInMinutes >= 1) {
      return `In ${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'}`;
    } else {
      return 'Now';
    }
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return dateString; // Fallback to original string
  }
};

/**
 * Formats a due date for task cards with relative time and styling hints
 */
export const formatDueDate = (dateString: string): { text: string; isOverdue: boolean; isToday: boolean; isTomorrow: boolean } => {
  try {
    // For date-only strings (YYYY-MM-DD), parse components directly to avoid timezone issues
    let taskDate: Date;
    if (!dateString.includes('T')) {
      // Parse YYYY-MM-DD format directly without timezone conversion
      const [year, month, day] = dateString.split('-').map(Number);
      taskDate = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      // Handle full datetime strings
      taskDate = new Date(dateString);
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    
    const isOverdue = taskDateOnly < today;
    const isToday = taskDateOnly.getTime() === today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = taskDateOnly.getTime() === tomorrow.getTime();
    
    const relativeText = formatRelativeDate(dateString);
    
    return {
      text: relativeText,
      isOverdue,
      isToday,
      isTomorrow
    };
  } catch (error) {
    console.error('Error formatting due date:', error);
    return {
      text: dateString,
      isOverdue: false,
      isToday: false,
      isTomorrow: false
    };
  }
};

/**
 * Formats a created/completed date with relative time
 */
export const formatCreatedDate = (dateString: string | null): string => {
  if (!dateString) return 'Not available';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    }
  } catch (error) {
    console.error('Error formatting created date:', error);
    return dateString;
  }
};

/**
 * Converts a UTC datetime string to user's local timezone and returns date in YYYY-MM-DD format
 * This handles Microsoft To-Do API responses that come with UTC timezone
 * 
 * @param utcDateTime - UTC datetime string (e.g., "2025-07-22T18:30:00.0000000")
 * @returns Date string in YYYY-MM-DD format in user's local timezone
 */
export const convertUtcToUserTimezone = (utcDateTime: string): string => {
  try {
    // Ensure the datetime string is properly formatted for UTC parsing
    const utcDateString = utcDateTime.endsWith('Z') ? utcDateTime : utcDateTime + 'Z';
    
    // Parse as UTC date
    const utcDate = new Date(utcDateString);
    
    // Check if parsing was successful
    if (isNaN(utcDate.getTime())) {
      console.warn(`Invalid UTC datetime string: ${utcDateTime}`);
      return utcDateTime.split('T')[0]; // Fallback to original date part
    }
    
    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Convert to user's local timezone
    // The browser automatically handles the timezone conversion
    const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: userTimezone }));
    
    // Extract date in YYYY-MM-DD format
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error converting UTC to user timezone:', error);
    // Fallback: extract date part from original string
    return utcDateTime.split('T')[0];
  }
};

