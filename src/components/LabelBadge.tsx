import type { Label } from '@doist/todoist-api-typescript';
import { cn } from '@/lib/utils';

interface LabelBadgeProps {
  label: Label;
  variant?: 'default' | 'small';
  className?: string;
  isSelected?: boolean;
  count?: number;
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getLabelColor = (colorName: string) => {
  // Check if it's a hex color
  if (colorName.startsWith('#')) {
    return {
      bg: '',
      text: '',
      border: '',
      customStyle: {
        backgroundColor: hexToRgba(colorName, 0.1),
        color: colorName,
        borderColor: hexToRgba(colorName, 0.3),
      }
    };
  }
  
  // Todoist label color mapping
  const colorMap: Record<string, { bg: string, text: string, border: string }> = {
    berry_red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    olive_green: { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-200' },
    lime_green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    mint_green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    sky_blue: { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
    light_blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    grape: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
    lavender: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    magenta: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
    salmon: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
    charcoal: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    grey: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    taupe: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  };
  return colorMap[colorName] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
};

const LabelBadge: React.FC<LabelBadgeProps> = ({ 
  label, 
  variant = 'default',
  className,
  isSelected = false,
  count
}) => {

  const colors = getLabelColor(label.color);
  
  const sizeClasses = variant === 'small' 
    ? 'px-1 py-0.5 text-xs' 
    : 'px-1.5 py-0.5 text-xs';

  // Handle hex colors with custom styles
  if (colors.customStyle) {
    return (
      <span 
        className={cn(
          'inline-flex items-center rounded-full font-normal border',
          sizeClasses,
          isSelected 
            ? 'bg-gray-900 text-white border-gray-900'
            : '',
          className
        )}
        style={isSelected ? {} : colors.customStyle}
        title={label.name}
      >
        {label.name}
        {count !== undefined && (
          <span className="ml-1 opacity-75">
            ({count})
          </span>
        )}
      </span>
    );
  }

  // Handle Todoist named colors with Tailwind classes
  return (
    <span 
      className={cn(
        'inline-flex items-center rounded-full font-normal',
        sizeClasses,
        isSelected 
          ? 'bg-gray-900 text-white border-gray-900'
          : `${colors.bg} ${colors.text} border ${colors.border}`,
        className
      )}
      title={label.name}
    >
      {label.name}
      {count !== undefined && (
        <span className="ml-1 opacity-75">
          ({count})
        </span>
      )}
    </span>
  );
};

export default LabelBadge;