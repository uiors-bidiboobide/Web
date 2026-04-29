# Design System: Exam Helper Plus

## 1. Visual Theme & Atmosphere

基于 Claude (Anthropic) 设计系统的温暖学术风格 —— 一个重新构想的智能学习空间。整体体验建立在羊皮纸色调的画布上，唤起高质量纸张的感觉，而不是冰冷的数字界面。

学习工具需要温暖、专注、安静的氛围，让用户感受到知识的力量和学习的愉悦。

## 2. Color Palette

### Primary Colors
- **Anthropic Near Black** (`#141413`): 主文本颜色和深色表面
- **Terracotta Brand** (`#c96442`): 品牌强调色，用于 CTA 按钮和品牌时刻
- **Coral Accent** (`#d97757`): 次级强调色，用于链接和辅助强调

### Surface & Background
- **Parchment** (`#f5f4ed`): 主页面背景
- **Ivory** (`#faf9f5`): 卡片和容器背景
- **Warm Sand** (`#e8e6dc`): 按钮背景
- **Warm Silver** (`#b0aea5`): 深色表面上的文本

### Neutrals
- **Charcoal Warm** (`#4d4c48`): 按钮文本
- **Olive Gray** (`#5e5d59`): 次要正文文本
- **Stone Gray** (`#87867f`): 第三文本、注释
- **Border Cream** (`#f0eee6`): 浅色边框

## 3. Typography

- **Headlines**: Georgia serif, weight 500, tight line-height
- **Body/UI**: Source Sans 3 (Google Fonts), system-ui fallback
- **Code**: JetBrains Mono / system monospace

### Scale
- Display: 48-64px, serif
- H1: 36px, serif
- H2: 28px, serif
- H3: 22px, serif
- Body: 16px, sans-serif
- Small: 14px, sans-serif

## 4. Component Stylings

### Buttons
- Primary: Terracotta (`#c96442`) background, white text, 8px radius
- Secondary: Warm Sand (`#e8e6dc`) background, charcoal text, 8px radius
- Ghost: transparent background, terracotta text, subtle hover

### Cards
- Background: Ivory (`#faf9f5`) or white
- Border: 1px solid Border Cream (`#f0eee6`)
- Radius: 12px (comfortably rounded)
- Shadow: whisper-soft (`rgba(0,0,0,0.05) 0px 4px 24px`)

### Inputs
- Border: warm borders
- Focus: terracotta ring
- Radius: 10px

## 5. Layout

- Max container: 1200px
- Section spacing: generous (80-120px)
- Card padding: 24-32px

## 6. Anti-Patterns

- No cool blue-grays
- No sharp corners
- No heavy shadows
- No Inter font
- No gradient backgrounds
