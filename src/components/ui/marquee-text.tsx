'use client';

import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export function MarqueeText({ text, className = '' }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (container && textEl) {
      // clientWidth / scrollWidth are reliable measurements for text overflow
      const overflow = textEl.scrollWidth > container.clientWidth;
      setIsOverflowing(overflow);
      if (overflow) {
        setScrollX(textEl.scrollWidth - container.clientWidth);
      }
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap min-w-0 relative flex-1 ${className}`}
    >
      <span
        ref={textRef}
        className={isOverflowing ? 'animate-marquee' : ''}
        style={
          isOverflowing
            ? {
                ['--scroll-x' as string]: `-${scrollX}px`,
                ['--marquee-duration' as string]: `${Math.max(4, scrollX * 0.05 + 2)}s`,
              }
            : {}
        }
      >
        {text}
      </span>
    </div>
  );
}
