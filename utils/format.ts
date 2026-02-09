export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  // Check if already in DD/MM/YYYY to avoid double formatting
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid
  
  // Format as DD/MM/YYYY
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};