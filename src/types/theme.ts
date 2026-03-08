// 主题类型定义
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // 背景色
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgHeader: string;
  bgInput: string;
  bgButton: string;
  bgOverlay: string;

  // 文字色
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // 边框色
  borderPrimary: string;
  borderSecondary: string;
  borderFocus: string;

  // 强调色
  accentPrimary: string;
  accentSecondary: string;
  accentSuccess: string;
  accentDanger: string;

  // 渐变背景
  gradientBg: string;
  gradientGlow1: string;
  gradientGlow2: string;
  gradientGlow3: string;
}
