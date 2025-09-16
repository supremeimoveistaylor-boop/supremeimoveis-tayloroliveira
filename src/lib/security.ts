// Security utilities for input validation and sanitization

export const sanitizeInput = (input: string | null | undefined): string => {
  if (!input) return '';
  
  return input
    // Remove potential XSS vectors
    .replace(/[<>]/g, '')
    // Remove potential SQL injection patterns
    .replace(/['";]/g, '')
    // Remove excessive whitespace
    .trim()
    // Limit length to prevent DoS
    .substring(0, 10000);
};

export const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS URLs for external links
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      return null;
    }
    
    // Validate specific domains for WhatsApp and YouTube
    const hostname = parsedUrl.hostname.toLowerCase();
    const isWhatsApp = hostname.includes('wa.me') || hostname.includes('api.whatsapp.com');
    const isYouTube = hostname.includes('youtube.com') || hostname.includes('youtu.be');
    
    if (!isWhatsApp && !isYouTube) {
      return null;
    }
    
    return sanitizeInput(url);
  } catch {
    return null;
  }
};

export const validatePrice = (price: number | string): boolean => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice > 0 && numPrice <= 999999999;
};

export const validateArea = (area: number | string | null): boolean => {
  if (!area) return true; // Optional field
  const numArea = typeof area === 'string' ? parseFloat(area) : area;
  return !isNaN(numArea) && numArea > 0 && numArea <= 100000;
};

export const validateRoomCount = (count: number | string | null): boolean => {
  if (!count) return true; // Optional field
  const numCount = typeof count === 'string' ? parseInt(count) : count;
  return !isNaN(numCount) && numCount >= 0 && numCount <= 50;
};

export const sanitizeImageArray = (images: string[]): string[] => {
  return images
    .filter(img => img && typeof img === 'string')
    .map(img => sanitizeInput(img))
    .slice(0, 20); // Limit to 20 images max
};

export const sanitizeAmenitiesArray = (amenities: string[]): string[] => {
  return amenities
    .filter(amenity => amenity && typeof amenity === 'string')
    .map(amenity => sanitizeInput(amenity))
    .slice(0, 50); // Limit to 50 amenities max
};

// Security-focused error message sanitization
export const sanitizeErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return sanitizeInput(error);
  }
  
  if (error?.message) {
    // Remove potentially sensitive information from error messages
    let message = sanitizeInput(error.message);
    
    // Generic error messages for common issues
    if (message.toLowerCase().includes('permission denied')) {
      return 'Acesso negado. Verifique suas permissões.';
    }
    
    if (message.toLowerCase().includes('invalid input')) {
      return 'Dados inválidos. Verifique os campos preenchidos.';
    }
    
    if (message.toLowerCase().includes('duplicate key')) {
      return 'Este item já existe no sistema.';
    }
    
    return message;
  }
  
  return 'Erro desconhecido. Tente novamente.';
};

// Validate file types for image uploads
export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return false;
  }
  
  if (file.size > maxSize) {
    return false;
  }
  
  return true;
};