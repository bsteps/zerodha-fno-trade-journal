import React, { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  id: string;
  children?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  tooltipClassName?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({
  content,
  id,
  children,
  className = '',
  iconClassName = 'w-4 h-4 text-gray-400 ml-1 hover:text-gray-600',
  tooltipClassName = '',
  position = 'top'
}: InfoTooltipProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close tooltips
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTooltip(null);
      }
    };

    if (activeTooltip) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [activeTooltip]);

  // Calculate optimal position based on available space
  useEffect(() => {
    if (activeTooltip === id && triggerRef.current && tooltipRef.current) {
      const calculatePosition = () => {
        const trigger = triggerRef.current!;
        const tooltip = tooltipRef.current!;
        const triggerRect = trigger.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };

        // Define spacing from edges
        const spacing = 16;
        const tooltipWidth = Math.min(288, viewport.width - 32); // Max width with mobile consideration
        const tooltipHeight = tooltipRect.height || 120; // Estimated height

        // Check space in each direction
        const spaceTop = triggerRect.top;
        const spaceBottom = viewport.height - triggerRect.bottom;
        const spaceLeft = triggerRect.left;
        const spaceRight = viewport.width - triggerRect.right;

        // For mobile devices, prefer top/bottom positions
        const isMobile = viewport.width < 768;

        // Determine best position based on available space
        let bestPosition = position;

        // On mobile, prefer vertical positions (top/bottom) for better UX
        if (isMobile) {
          if (spaceBottom >= tooltipHeight + spacing) {
            bestPosition = 'bottom';
          } else if (spaceTop >= tooltipHeight + spacing) {
            bestPosition = 'top';
          } else {
            // Use the position with more space
            bestPosition = spaceBottom > spaceTop ? 'bottom' : 'top';
          }
        } else {
          // Desktop positioning logic
          if (position === 'top' && spaceTop < tooltipHeight + spacing) {
            // Not enough space above, try below
            if (spaceBottom >= tooltipHeight + spacing) {
              bestPosition = 'bottom';
            } else if (spaceRight >= tooltipWidth + spacing) {
              bestPosition = 'right';
            } else if (spaceLeft >= tooltipWidth + spacing) {
              bestPosition = 'left';
            } else {
              // Use bottom as fallback even if space is limited
              bestPosition = 'bottom';
            }
          } else if (position === 'bottom' && spaceBottom < tooltipHeight + spacing) {
            // Not enough space below, try above
            if (spaceTop >= tooltipHeight + spacing) {
              bestPosition = 'top';
            } else if (spaceRight >= tooltipWidth + spacing) {
              bestPosition = 'right';
            } else if (spaceLeft >= tooltipWidth + spacing) {
              bestPosition = 'left';
            } else {
              // Use top as fallback
              bestPosition = 'top';
            }
          } else if (position === 'left' && spaceLeft < tooltipWidth + spacing) {
            // Not enough space to the left, try right
            if (spaceRight >= tooltipWidth + spacing) {
              bestPosition = 'right';
            } else if (spaceTop >= tooltipHeight + spacing) {
              bestPosition = 'top';
            } else if (spaceBottom >= tooltipHeight + spacing) {
              bestPosition = 'bottom';
            } else {
              bestPosition = 'right';
            }
          } else if (position === 'right' && spaceRight < tooltipWidth + spacing) {
            // Not enough space to the right, try left
            if (spaceLeft >= tooltipWidth + spacing) {
              bestPosition = 'left';
            } else if (spaceTop >= tooltipHeight + spacing) {
              bestPosition = 'top';
            } else if (spaceBottom >= tooltipHeight + spacing) {
              bestPosition = 'bottom';
            } else {
              bestPosition = 'left';
            }
          }
        }

        setActualPosition(bestPosition);
      };

      // Calculate position after tooltip is rendered
      const timeoutId = setTimeout(calculatePosition, 0);

      // Recalculate on window resize
      window.addEventListener('resize', calculatePosition);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [activeTooltip, id, position]);

  const handleInteraction = () => {
    if (activeTooltip === id) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip(id);
    }
  };

  const handleMouseEnter = () => {
    // Only use hover on non-touch devices
    if (!('ontouchstart' in window)) {
      setActiveTooltip(id);
    }
  };

  const handleMouseLeave = () => {
    // Only use hover on non-touch devices
    if (!('ontouchstart' in window)) {
      setActiveTooltip(null);
    }
  };

  // Position classes based on calculated position with edge detection
  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50 w-64 sm:w-72 max-w-[calc(100vw-2rem)] p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg';

    switch (actualPosition) {
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      case 'top':
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  // Arrow classes based on calculated position
  const getArrowClasses = () => {
    const baseArrowClasses = 'absolute w-0 h-0';

    switch (actualPosition) {
      case 'bottom':
        return `${baseArrowClasses} border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 bottom-full left-1/2 transform -translate-x-1/2`;
      case 'left':
        return `${baseArrowClasses} border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900 left-full top-1/2 transform -translate-y-1/2`;
      case 'right':
        return `${baseArrowClasses} border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 right-full top-1/2 transform -translate-y-1/2`;
      case 'top':
      default:
        return `${baseArrowClasses} border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 top-full left-1/2 transform -translate-x-1/2`;
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onClick={handleInteraction}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help touch-manipulation"
        role="button"
        tabIndex={0}
        aria-label="Show help information"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleInteraction();
          }
        }}
      >
        {children || <Info className={iconClassName} />}
      </div>
      {activeTooltip === id && (
        <>
          {/* Mobile backdrop to close tooltip */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={() => setActiveTooltip(null)}
            aria-hidden="true"
          />
          {/* Tooltip content */}
          <div ref={tooltipRef} className={`${getPositionClasses()} ${tooltipClassName}`}>
            <div className="relative">
              {content}
              {/* Close button for mobile */}
              <button
                onClick={() => setActiveTooltip(null)}
                className="absolute top-1 right-1 w-5 h-5 text-gray-300 hover:text-white md:hidden"
                aria-label="Close tooltip"
              >
                ×
              </button>
              {/* Arrow pointing to icon */}
              <div className={getArrowClasses()}></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Convenience component for common use case with default Info icon
export function InfoIcon({
  content,
  id,
  className = '',
  iconClassName = 'w-4 h-4 text-gray-400 ml-1 hover:text-gray-600',
  position = 'top'
}: Omit<InfoTooltipProps, 'children'>) {
  return (
    <InfoTooltip
      content={content}
      id={id}
      className={className}
      iconClassName={iconClassName}
      position={position}
    />
  );
}
