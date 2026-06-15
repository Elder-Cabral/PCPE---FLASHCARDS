import { useState } from 'react';

export function useAsyncError() {
  const [msg, setMsg] = useState<string | null>(null);

  const ErrorToast = () => (
    msg ? (
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(239,68,68,0.9)', color: '#fff', padding: '12px 20px',
        borderRadius: 8, zIndex: 1000, fontSize: 13
      }}>{msg}</div>
    ) : null
  );

  return { setError: setMsg, ErrorToast };
}
