/**
 * Browser Compatibility Utilities
 * 
 * Detects browser capabilities for advanced media features like screen recording
 * and system audio capture. Used to show appropriate UI feedback.
 * 
 * Implements RF-08: Communications and collaboration
 */

export interface BrowserCapabilities {
  /** Whether the browser supports getDisplayMedia for screen capture */
  supportsScreenCapture: boolean;
  /** Whether getDisplayMedia supports capturing system audio */
  supportsSystemAudio: boolean;
  /** Browser name for display purposes */
  browserName: string;
  /** Whether the browser is fully supported for all recording features */
  isFullySupported: boolean;
  /** Message explaining any limitations */
  limitationMessage: string | null;
}

/**
 * Detects the current browser name
 */
function detectBrowser(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('edg/')) return 'Microsoft Edge';
  if (userAgent.includes('chrome')) return 'Google Chrome';
  if (userAgent.includes('firefox')) return 'Mozilla Firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
  if (userAgent.includes('opera') || userAgent.includes('opr')) return 'Opera';
  
  return 'Unknown Browser';
}

/**
 * Checks if the browser supports screen capture via getDisplayMedia
 */
function checkScreenCaptureSupport(): boolean {
  return !!(navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices);
}

/**
 * Checks if the browser supports system audio capture
 * Only Chromium-based browsers (Chrome, Edge, Opera) support this
 */
function checkSystemAudioSupport(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Chromium-based browsers support system audio in getDisplayMedia
  const isChromium = 
    userAgent.includes('chrome') || 
    userAgent.includes('edg/') || 
    userAgent.includes('opr');
  
  // Firefox and Safari do NOT support system audio capture
  const isFirefox = userAgent.includes('firefox');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  
  return isChromium && !isFirefox && !isSafari;
}

/**
 * Gets browser compatibility information for recording features
 */
export function getBrowserCapabilities(): BrowserCapabilities {
  const browserName = detectBrowser();
  const supportsScreenCapture = checkScreenCaptureSupport();
  const supportsSystemAudio = checkSystemAudioSupport();
  const isFullySupported = supportsScreenCapture && supportsSystemAudio;
  
  let limitationMessage: string | null = null;
  
  if (!supportsScreenCapture) {
    limitationMessage = 'screenCaptureNotSupported';
  } else if (!supportsSystemAudio) {
    limitationMessage = 'systemAudioNotSupported';
  }
  
  return {
    supportsScreenCapture,
    supportsSystemAudio,
    browserName,
    isFullySupported,
    limitationMessage,
  };
}

/**
 * Returns a list of browsers that fully support all recording features
 */
export function getSupportedBrowsers(): string[] {
  return [
    'Google Chrome (v74+)',
    'Microsoft Edge (v79+)',
    'Opera (v60+)',
  ];
}

/**
 * Returns a list of browsers with partial support
 */
export function getPartiallySupportedBrowsers(): string[] {
  return [
    'Mozilla Firefox (screen only, no system audio)',
    'Safari (screen only, no system audio)',
  ];
}
