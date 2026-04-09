import React, { createContext, useContext, ReactNode } from 'react';

export interface TextScaleConfig {
  body: {
    fontSize: number;
    lineHeight: number;
  };
  heading: {
    fontSize: number;
    fontWeight: '400' | '600' | '700';
    marginBottom: number;
  };
  small: {
    fontSize: number;
    lineHeight: number;
  };
}

const defaultScale: TextScaleConfig = {
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  heading: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
  },
};

const TextScalingContext = createContext<TextScaleConfig>(defaultScale);

export const useTextScale = () => useContext(TextScalingContext);

interface TextScalingProviderProps {
  children: ReactNode;
}

export const TextScalingProvider: React.FC<TextScalingProviderProps> = ({ children }) => {
  return (
    <TextScalingContext.Provider value={defaultScale}>
      {children}
    </TextScalingContext.Provider>
  );
};
