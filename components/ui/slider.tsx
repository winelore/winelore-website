'use client'

import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '@/lib/utils'

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  showSteps?: boolean
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  showSteps = false,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  )

  const stepCount = Math.round((max - min) / step)
  
  // Adaptive tick intervals
  let minorStep = step
  let majorStep = step
  const rangeVal = max - min
  if (rangeVal <= 10) {
    minorStep = step
    majorStep = step
  } else if (rangeVal <= 20) {
    minorStep = step
    majorStep = step * 2
  } else if (rangeVal <= 50) {
    minorStep = step
    majorStep = step * 5
  } else {
    minorStep = step * 5
    majorStep = step * 20
  }

  const showTicks = showSteps && stepCount > 0 && stepCount <= 100
  
  // Generate tick values list
  const ticks: number[] = []
  if (showTicks) {
    for (let val = min; val <= max; val = Number((val + minorStep).toFixed(1))) {
      ticks.push(val)
    }
  }

  const currentValue = Array.isArray(value) ? value[0] : (Array.isArray(defaultValue) ? defaultValue[0] : min)

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={
          'bg-slate-200 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5'
        }
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={
            'bg-indigo-600 absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
          }
        />
      </SliderPrimitive.Track>

      {showTicks && (
        <div className="absolute left-[14px] right-[14px] top-1/2 w-[calc(100%-28px)] h-8 pointer-events-none select-none z-0">
          {ticks.map((tickVal) => {
            const percentage = ((tickVal - min) / (max - min)) * 100
            const isMajor = Number(((tickVal - min) % majorStep).toFixed(1)) === 0 || tickVal === min || tickVal === max
            const isActive = tickVal <= currentValue

            return (
              <div
                key={tickVal}
                className="absolute flex flex-col items-center"
                style={{ left: `${percentage}%`, transform: 'translateX(-50%)', top: '3px' }}
              >
                <div
                  className={cn(
                    "w-[1px] transition-colors duration-200",
                    isMajor ? "h-1.5" : "h-1",
                    isActive ? "bg-indigo-600" : "bg-slate-300"
                  )}
                />
                {isMajor && (
                  <span className={cn(
                    "text-[9px] mt-1 font-semibold transition-colors duration-200",
                    isActive ? "text-indigo-600 font-extrabold" : "text-slate-400"
                  )}>
                    {tickVal}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-slate-200 ring-indigo-500/20 block w-7 h-4.5 z-50! shrink-0 rounded-full border bg-white! shadow-md transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
