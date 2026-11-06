"use client";
// Frozen NTA copy of contexts/ui-template.context.tsx (M1 NTA freeze). The exam screens must stay pixel-identical: do not restyle.

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { TestUITemplate } from "@/lib/api";

// Default template values (Classic Blue)
const DEFAULT_TEMPLATE: TestUITemplate = {
  _id: "default",
  name: "Default",
  colorScheme: {
    primary: "#3b82f6",
    secondary: "#6366f1",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    accent: "#0ea5e9",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    border: "#e2e8f0",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    questionFontSize: "medium",
    optionFontSize: "medium",
  },
  layout: {
    questionPanelPosition: "center",
    navigationPosition: "bottom",
    showTimer: true,
    showQuestionPalette: true,
    compactMode: false,
  },
  branding: {
    showLogo: true,
    instituteName: "IIT Pulse",
  },
  buttonStyles: {
    borderRadius: "medium",
    variant: "solid",
  },
  animations: {
    enableTransitions: true,
    questionTransition: "fade",
  },
};

interface UITemplateContextType {
  template: TestUITemplate;
  isLoading: boolean;
  error: string | null;
  loadTemplate: (templateId?: string) => Promise<void>;
  getCSSVariables: () => Record<string, string>;
  getFontSize: (size: "small" | "medium" | "large") => string;
  getBorderRadius: (radius: "none" | "small" | "medium" | "large" | "full") => string;
}

const UITemplateContext = createContext<UITemplateContextType | undefined>(undefined);

export function UITemplateProvider({ children }: { children: React.ReactNode }) {
  const [template, setTemplate] = useState<TestUITemplate>(DEFAULT_TEMPLATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // M6 (contract item 5): the exam layout keeps the NTA values above. Colours, fonts and branding are no longer part of
  // an exam template (templates v2 carry wording, instructions and tools, delivered with the exam payload), so the old
  // /ui-template routes are not read any more. Kept as a no-op so callers stay unchanged.
  // Memoized: consumers put it in effect deps.
  const loadTemplate = useCallback(async (templateId?: string) => {
    void templateId;
    setTemplate(DEFAULT_TEMPLATE);
    setError(null);
    setIsLoading(false);
  }, []);

  // Generate CSS variables from template
  const getCSSVariables = (): Record<string, string> => {
    return {
      "--ui-primary": template.colorScheme.primary,
      "--ui-secondary": template.colorScheme.secondary,
      "--ui-background": template.colorScheme.background,
      "--ui-surface": template.colorScheme.surface,
      "--ui-text": template.colorScheme.text,
      "--ui-text-secondary": template.colorScheme.textSecondary,
      "--ui-accent": template.colorScheme.accent,
      "--ui-success": template.colorScheme.success,
      "--ui-warning": template.colorScheme.warning,
      "--ui-error": template.colorScheme.error,
      "--ui-border": template.colorScheme.border,
      "--ui-font-family": template.typography.fontFamily,
    };
  };

  // Get font size value
  const getFontSize = (size: "small" | "medium" | "large"): string => {
    const sizes = {
      small: "0.875rem",
      medium: "1rem",
      large: "1.125rem",
    };
    return sizes[size] || sizes.medium;
  };

  // Get border radius value
  const getBorderRadius = (radius: "none" | "small" | "medium" | "large" | "full"): string => {
    const radii = {
      none: "0",
      small: "0.25rem",
      medium: "0.5rem",
      large: "0.75rem",
      full: "9999px",
    };
    return radii[radius] || radii.medium;
  };

  const value = useMemo(
    () => ({
      template,
      isLoading,
      error,
      loadTemplate,
      getCSSVariables,
      getFontSize,
      getBorderRadius,
    }),
    [template, isLoading, error]
  );

  return (
    <UITemplateContext.Provider value={value}>
      {children}
    </UITemplateContext.Provider>
  );
}

export function useUITemplate() {
  const context = useContext(UITemplateContext);
  if (context === undefined) {
    throw new Error("useUITemplate must be used within a UITemplateProvider");
  }
  return context;
}

// Hook to apply template styles to a container
export function useTemplateStyles() {
  const { template, getCSSVariables, getFontSize, getBorderRadius } = useUITemplate();

  const containerStyle: React.CSSProperties = {
    backgroundColor: template.colorScheme.background,
    color: template.colorScheme.text,
    fontFamily: template.typography.fontFamily,
    ...getCSSVariables() as React.CSSProperties,
  };

  const questionStyle: React.CSSProperties = {
    fontSize: getFontSize(template.typography.questionFontSize),
  };

  const optionStyle: React.CSSProperties = {
    fontSize: getFontSize(template.typography.optionFontSize),
    borderRadius: getBorderRadius(template.buttonStyles.borderRadius),
  };

  const buttonStyle: React.CSSProperties = {
    borderRadius: getBorderRadius(template.buttonStyles.borderRadius),
    backgroundColor:
      template.buttonStyles.variant === "solid"
        ? template.colorScheme.primary
        : "transparent",
    color:
      template.buttonStyles.variant === "solid"
        ? "#ffffff"
        : template.colorScheme.primary,
    border:
      template.buttonStyles.variant === "outline"
        ? `1px solid ${template.colorScheme.primary}`
        : "none",
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: template.colorScheme.surface,
    borderColor: template.colorScheme.border,
  };

  const surfaceStyle: React.CSSProperties = {
    backgroundColor: template.colorScheme.surface,
    borderColor: template.colorScheme.border,
  };

  return {
    template,
    containerStyle,
    questionStyle,
    optionStyle,
    buttonStyle,
    headerStyle,
    surfaceStyle,
    colors: template.colorScheme,
    layout: template.layout,
    branding: template.branding,
    animations: template.animations,
  };
}
