'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}

export function CrispChat() {
  useEffect(() => {
    // Only load in production
    if (process.env.NODE_ENV === 'development') return;
    
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || '';

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.getElementsByTagName('head')[0].appendChild(script);

    // Configure Crisp
    window.$crisp.push(['safe', true]);
    
    // Set user data if available
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email) {
      window.$crisp.push(['set', 'user:email', [user.email]]);
      window.$crisp.push(['set', 'user:nickname', [user.name || user.email]]);
    }

    return () => {
      // Clean up if needed
      const crispScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (crispScript) {
        crispScript.remove();
      }
    };
  }, []);

  return null;
}