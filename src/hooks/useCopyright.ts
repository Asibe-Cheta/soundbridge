import { useState, useCallback } from 'react';
import { copyrightService } from '../lib/copyright-service';
import type {
  CopyrightCheckResult,
  CopyrightViolationReport,
  DMCARequest,
  CopyrightSettings
} from '../lib/types/upload';

export function useCopyright() {
  const [isChecking, setIsChecking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isSubmittingDMCA, setIsSubmittingDMCA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check copyright violation
  const checkCopyrightViolation = useCallback(async (
    trackId: string,
    creatorId: string,
    audioFile: File
  ): Promise<CopyrightCheckResult | null> => {
    setIsChecking(true);
    setError(null);

    try {
      const result = await copyrightService.checkCopyrightViolation(
        trackId,
        creatorId,
        audioFile
      );
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check copyright';
      setError(errorMessage);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Report copyright violation
  const reportViolation = useCallback(async (report: CopyrightViolationReport): Promise<boolean> => {
    setIsReporting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await copyrightService.reportViolation(report);
      
      if (result.success) {
        setSuccessMessage('Copyright violation reported successfully');
        return true;
      } else {
        setError(result.error || 'Failed to report violation');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to report violation';
      setError(errorMessage);
      return false;
    } finally {
      setIsReporting(false);
    }
  }, []);

  // Submit DMCA request
  const submitDMCARequest = useCallback(async (request: DMCARequest): Promise<boolean> => {
    setIsSubmittingDMCA(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await copyrightService.submitDMCARequest(request);
      
      if (result.success) {
        setSuccessMessage('DMCA request submitted successfully');
        return true;
      } else {
        setError(result.error || 'Failed to submit DMCA request');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit DMCA request';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmittingDMCA(false);
    }
  }, []);

  // Update copyright status
  const updateCopyrightStatus = useCallback(async (
    trackId: string,
    status: 'pending' | 'approved' | 'flagged' | 'blocked',
    reviewerId?: string,
    notes?: string
  ): Promise<boolean> => {
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await copyrightService.updateCopyrightStatus(
        trackId,
        status,
        reviewerId,
        notes
      );
      
      if (result.success) {
        setSuccessMessage(`Copyright status updated to ${status}`);
        return true;
      } else {
        setError(result.error || 'Failed to update copyright status');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update copyright status';
      setError(errorMessage);
      return false;
    }
  }, []);

  // Get copyright settings
  const getCopyrightSettings = useCallback(async (): Promise<CopyrightSettings | null> => {
    try {
      const settings = await copyrightService.getCopyrightSettings();
      return settings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get copyright settings';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Get copyright statistics
  const getCopyrightStats = useCallback(async () => {
    try {
      const stats = await copyrightService.getCopyrightStats();
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get copyright statistics';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    // State
    isChecking,
    isReporting,
    isSubmittingDMCA,
    error,
    successMessage,

    // Actions
    checkCopyrightViolation,
    reportViolation,
    submitDMCARequest,
    updateCopyrightStatus,
    getCopyrightSettings,
    getCopyrightStats,
    clearMessages
  };
}
