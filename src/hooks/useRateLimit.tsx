import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitState {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

export const useRateLimit = (key: string, config: RateLimitConfig) => {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>(() => {
    const stored = localStorage.getItem(`rateLimit_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Clear expired blocks
      if (parsed.blockedUntil && parsed.blockedUntil < Date.now()) {
        localStorage.removeItem(`rateLimit_${key}`);
        return { attempts: 0, firstAttempt: 0 };
      }
      return parsed;
    }
    return { attempts: 0, firstAttempt: 0 };
  });

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    
    // Check if currently blocked
    if (rateLimitState.blockedUntil && rateLimitState.blockedUntil > now) {
      toast({
        title: "Muitas tentativas",
        description: "Aguarde antes de tentar novamente.",
        variant: "destructive",
      });
      return false;
    }

    // Reset window if expired
    if (now - rateLimitState.firstAttempt > config.windowMs) {
      const newState = { attempts: 1, firstAttempt: now };
      setRateLimitState(newState);
      localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
      return true;
    }

    // Check if limit exceeded
    if (rateLimitState.attempts >= config.maxAttempts) {
      const blockedUntil = now + (config.blockDurationMs || config.windowMs);
      const newState = {
        ...rateLimitState,
        blockedUntil
      };
      setRateLimitState(newState);
      localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
      
      toast({
        title: "Limite excedido",
        description: "Muitas tentativas. Aguarde para tentar novamente.",
        variant: "destructive",
      });
      return false;
    }

    // Increment attempts
    const newState = {
      ...rateLimitState,
      attempts: rateLimitState.attempts + 1
    };
    setRateLimitState(newState);
    localStorage.setItem(`rateLimit_${key}`, JSON.stringify(newState));
    return true;
  }, [key, config, rateLimitState]);

  const resetRateLimit = useCallback(() => {
    const newState = { attempts: 0, firstAttempt: 0 };
    setRateLimitState(newState);
    localStorage.removeItem(`rateLimit_${key}`);
  }, [key]);

  return {
    checkRateLimit,
    resetRateLimit,
    isBlocked: rateLimitState.blockedUntil ? rateLimitState.blockedUntil > Date.now() : false,
    attemptsRemaining: Math.max(0, config.maxAttempts - rateLimitState.attempts)
  };
};