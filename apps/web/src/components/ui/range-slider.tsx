"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface RangeSliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Custom class for the filled range track (default: bg-coral) */
  rangeClassName?: string;
  /** Custom class for the thumb border (default: border-coral) */
  thumbClassName?: string;
}

const RangeSlider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  RangeSliderProps
>(({ className, rangeClassName, thumbClassName, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-warm-grey">
      <SliderPrimitive.Range className={cn("absolute h-full rounded-full transition-colors duration-200", rangeClassName ?? "bg-coral")} />
    </SliderPrimitive.Track>
    {(props.defaultValue ?? props.value ?? [0, 100]).map((_, i) => (
      <SliderPrimitive.Thumb
        key={i}
        className={cn(
          "block h-5 w-5 rounded-full bg-white shadow-md border-2 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          thumbClassName ?? "border-coral focus-visible:ring-coral/50",
        )}
      />
    ))}
  </SliderPrimitive.Root>
));
RangeSlider.displayName = "RangeSlider";

export { RangeSlider };
