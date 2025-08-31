# React Native Expo Design System

A comprehensive, production-ready design system for React Native apps built with Expo. This design system provides a consistent visual language, typography system with Google Fonts, and reusable components to accelerate development while maintaining design consistency.

## 🎨 Features

- **Font System**: Google Fonts integration with centralized font management
- **Complete Theme System**: Light/dark mode support with comprehensive color palettes
- **Typography Scale**: Consistent text styles with proper hierarchy
- **Reusable Components**: Button, Input, and layout components with multiple variants
- **Spacing System**: 8px-based spacing grid for consistent layouts
- **TypeScript Support**: Fully typed for better developer experience
- **Live Style Guide**: Interactive documentation of all components

## 📁 Structure

```
theme/
├── types.ts          # TypeScript definitions
├── fonts.ts          # Font definitions and loading
├── colors.ts         # Color palette definitions
├── themes.ts         # Light/dark theme configurations
└── ThemeProvider.tsx # Theme context provider

components/
├── Typography/
│   └── Text.tsx      # Typography component
├── Button/
│   └── Button.tsx    # Button component with variants
├── Input/
│   └── Input.tsx     # Input component with variants
└── Layout/
    └── Container.tsx # Layout container component
    └── SafeAreaWrapper.tsx # Safe area handling
    └── index.ts      # Layout exports
```

## 🚀 Quick Start

### Font Loading

Fonts are automatically loaded when the app starts. The system uses:
- **Poppins**: For headings (H1-H4)
- **Inter**: For body text, buttons, and UI elements

To change fonts globally, update the `FONT_FAMILIES` object in `theme/fonts.ts`:

```tsx
export const FONT_FAMILIES = {
  heading: {
    regular: 'YourHeadingFont-Regular',
    medium: 'YourHeadingFont-Medium',
    semiBold: 'YourHeadingFont-SemiBold', 
    bold: 'YourHeadingFont-Bold',
  },
  body: {
    regular: 'YourBodyFont-Regular',
    medium: 'YourBodyFont-Medium',
    semiBold: 'YourBodyFont-SemiBold',
    bold: 'YourBodyFont-Bold',
  },
};
```

### Theme Provider

The app is wrapped with `ThemeProvider` in `app/_layout.tsx`:

```tsx
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

### Using Theme in Components

```tsx
import { useTheme } from '@/theme/ThemeProvider';

export function MyComponent() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      {/* Your component content */}
    </View>
  );
}
```

## 📝 Typography

### Text Component

```tsx
import { Text } from '@/components/Typography/Text';

// Usage examples
<Text variant="h1">Heading 1</Text>
<Text variant="body" color="secondary">Body text</Text>
<Text variant="caption" color="muted">Caption text</Text>
```

### Available Variants
- `h1`, `h2`, `h3`, `h4`: Heading styles
- `body`, `bodySmall`: Body text styles
- `caption`: Small caption text
- `button`: Button text style

### Available Colors
- `primary`, `secondary`, `muted`: Text colors
- `inverse`: Inverse text color
- `error`, `success`, `warning`: Status colors

## 🎯 Buttons

### Button Component

```tsx
import { Button } from '@/components/Button/Button';

// Primary button
<Button variant="primary" onPress={() => {}}>
  Primary Button
</Button>

// Button with icon
<Button 
  variant="secondary" 
  icon={<Icon size={20} />}
  onPress={() => {}}
>
  With Icon
</Button>

// Loading state
<Button variant="primary" loading>
  Loading...
</Button>

// Floating Action Button
<Button 
  variant="fab" 
  icon={<Plus size={24} />}
  onPress={() => {}}
/>
```

### Button Variants
- `primary`: Main call-to-action buttons
- `secondary`: Secondary actions
- `tertiary`: Outlined buttons
- `ghost`: Text-only buttons
- `icon`: Icon-only buttons
- `fab`: Floating Action Button

### Button Props
- `variant`: Button style variant
- `size`: `sm`, `md`, `lg`
- `loading`: Shows loading indicator
- `disabled`: Disables interaction
- `fullWidth`: Expands to full width
- `icon`: Icon component

## 📝 Input Fields

### Input Component

```tsx
import { Input } from '@/components/Input/Input';

// Basic input
<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
/>

// Search input
<Input
  variant="search"
  placeholder="Search..."
  value={searchTerm}
  onChangeText={setSearchTerm}
/>

// Password input
<Input
  variant="password"
  label="Password"
  placeholder="Enter password"
  value={password}
  onChangeText={setPassword}
/>

// With error state
<Input
  label="Required Field"
  error="This field is required"
  state="error"
/>
```

### Input Variants
- `default`: Standard text input
- `search`: Search input with search icon
- `multiline`: Multi-line text area
- `password`: Password input with visibility toggle

### Input States
- `default`: Normal state
- `focus`: Focused state (auto-applied)
- `error`: Error state
- `disabled`: Disabled state

## 🎨 Colors & Theming

### Color System

The design system includes comprehensive color palettes:

- **Primary**: Main brand colors (blue scale)
- **Secondary**: Supporting colors (gray scale)
- **Neutral**: Neutral grays
- **Error**: Red scale for errors
- **Success**: Green scale for success states
- **Warning**: Orange scale for warnings

### Theme Structure

```tsx
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    error: string;
    success: string;
    warning: string;
    border: string;
  };
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}
```

### Theme Switching

```tsx
import { useTheme } from '@/theme/ThemeProvider';

export function ThemeToggle() {
  const { themeMode, setThemeMode, isDarkMode } = useTheme();
  
  return (
    <Button onPress={() => setThemeMode('dark')}>
      Switch to Dark Mode
    </Button>
  );
}
```

## 📏 Spacing System

Consistent 4px-based spacing system:

```tsx
const spacing = {
  xs: 4,    // Extra small
  sm: 8,    // Small  
  md: 12,   // Medium
  lg: 16,   // Large
  xl: 24,   // Extra large
  '2xl': 32, // 2x Extra large
  '3xl': 48, // 3x Extra large
  '4xl': 64, // 4x Extra large
};
```

### Using Spacing

```tsx
import { useTheme } from '@/theme/ThemeProvider';

export function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={{
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    }}>
      {/* Content */}
    </View>
  );
}
```

## 🏗️ Layout Components

### SafeAreaWrapper Component

Provides consistent safe area handling with platform-specific padding across all screens:

```tsx
import { SafeAreaWrapper } from '@/components/Layout';

export default function MyScreen() {
  return (
    <SafeAreaWrapper>
      {/* Your screen content */}
    </SafeAreaWrapper>
  );
}

// Custom background color
<SafeAreaWrapper backgroundColor="#custom-color">
  {/* Content */}
</SafeAreaWrapper>

// Disable platform padding if you want manual control
<SafeAreaWrapper includePlatformPadding={false}>
  {/* Content */}
</SafeAreaWrapper>

// Custom edges for safe area
<SafeAreaWrapper edges={['top', 'left', 'right']}>
  {/* Content - no bottom safe area */}
</SafeAreaWrapper>

// Alternative container for custom safe area handling
import { SafeAreaContainer } from '@/components/Layout';

<SafeAreaContainer>
  {/* Content with fixed platform-specific padding */}
</SafeAreaContainer>
```

### Container Component

```tsx
import { Container } from '@/components/Layout/Container';

<Container padding="lg" margin="md">
  <Text>Content with consistent padding and margins</Text>
</Container>
```

## 📱 Style Guide

The app includes a comprehensive style guide screen (`/style-guide`) that showcases:

- All typography variants
- Complete color palette
- All button variants and states
- Input field examples
- Spacing system visualization

Visit the Style Guide tab to see all components in action!

## 🔧 Customization

### Adding New Colors

1. Update the color palette in `theme/colors.ts`
2. Add new color mappings in `theme/themes.ts`
3. Update the TypeScript types in `theme/types.ts`

### Adding New Typography Variants

1. Add the new variant to the `Typography` interface in `theme/types.ts`
2. Implement the styles in `theme/themes.ts`
3. Update the `Text` component to handle the new variant

### Creating Custom Components

Follow the established patterns:

```tsx
import { useTheme } from '@/theme/ThemeProvider';

export function CustomComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      ...theme.shadows.sm,
    }}>
      {/* Component content */}
    </View>
  );
}
```

## 🎯 Best Practices

1. **Always use theme values**: Avoid hardcoded colors, spacing, or typography
2. **Consistent spacing**: Use the spacing system for margins, padding, and gaps
3. **Proper color contrast**: Ensure text colors meet accessibility standards
4. **Component composition**: Build complex UIs by composing simple components
5. **Type safety**: Leverage TypeScript for better development experience

## 📚 Component Reference

| Component | Props | Description |
|-----------|-------|-------------|
| `Text` | `variant`, `color` | Typography component |
| `Button` | `variant`, `size`, `loading`, `disabled` | Button component |
| `Input` | `variant`, `state`, `label`, `error` | Input field component |
| `Container` | `padding`, `margin` | Layout container |
| `CustomImagePicker` | `limit`, `value`, `onChange` | Image selection component |

This design system provides a solid foundation for building consistent, beautiful React Native apps with Expo. The modular structure makes it easy to extend and customize based on your specific needs.