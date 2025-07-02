import React from 'react';
import { useComputedColorScheme } from '@mantine/core';
import { customColors } from '../theme';

export const ModernSpinner: React.FC = () => {
  const colorScheme = useComputedColorScheme('dark');
  
  const windowBg = customColors.background[colorScheme];
  const borderColor = customColors.border[colorScheme];
  const accentColor = customColors.accent.blue[colorScheme];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        background: windowBg,
      }}
    >
      <div
        className="modern-spinner"
        style={{
          width: '32px',
          height: '32px',
          border: `3px solid ${borderColor}`,
          borderTop: `3px solid ${accentColor}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      
      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}; 