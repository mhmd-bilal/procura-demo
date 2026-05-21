"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, useReducedMotion } from "framer-motion"
import { useRef, useState, useEffect, useId } from "react"
import { cn } from "@/lib/utils"

// ─── Shared layout group ID - one per Tabs root instance ─────────────────────
// We derive it from React's useId so nested Tabs don't interfere.

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-start rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

// ─── TabsTrigger ──────────────────────────────────────────────────────────────

function TabsTrigger({ className, children, ...props }: TabsPrimitive.Tab.Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isActive, setIsActive] = useState(false)
  const layoutId = useId()
  const shouldReduceMotion = useReducedMotion()

  // Watch for Base UI toggling [data-active] on our button element
  useEffect(() => {
    const el = triggerRef.current
    if (!el) return

    // Read initial state
    setIsActive(el.hasAttribute("data-active"))

    // MutationObserver is the correct way to react to attribute changes
    // that are made outside React (as Base UI does internally)
    const observer = new MutationObserver(() => {
      setIsActive(el.hasAttribute("data-active"))
    })

    observer.observe(el, { attributes: true, attributeFilter: ["data-active"] })
    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.Tab
      ref={triggerRef}
      data-slot="tabs-trigger"
      className={cn(
        // ── Layout & base styles (unchanged) ───────────────────────
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start",
        "hover:text-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1",
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        "dark:text-muted-foreground dark:hover:text-foreground",
        // ── Active text colour (bg is handled by the pill below) ───
        "data-active:text-foreground dark:data-active:text-foreground",
        // ── Remove the original bg so the animated pill shows ──────
        "data-active:bg-transparent dark:data-active:bg-transparent dark:data-active:border-transparent",
        // ── Shadow kept on default variant ─────────────────────────
        "group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "group-data-[variant=line]/tabs-list:data-active:shadow-none",
        // ── SVG ────────────────────────────────────────────────────
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // ── Line variant overrides (unchanged) ─────────────────────
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "dark:group-data-[variant=line]/tabs-list:data-active:border-transparent",
        "dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        // ── Underline indicator for line variant (unchanged) ───────
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity",
        "group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5",
        "group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5",
        "group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    >
      {/*
        Framer Motion shared layout pill.
        layoutId must be IDENTICAL across all triggers in the same list
        so Framer knows to animate between them.
        We pass the same static ID string here - this works because only
        ONE trigger is active at a time, so only one pill exists in the DOM.
      */}
      {isActive && (
        <motion.span
          aria-hidden
          layoutId="tabs-active-pill"
          layout
          className="absolute inset-0 rounded-md bg-primary/10 dark:bg-primary/10"
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 400, damping: 38, mass: 0.8 }
          }
        />
      )}

      {/* Content sits above the pill */}
      <span className="relative z-10 flex items-center gap-1.5">
        {children}
      </span>
    </TabsPrimitive.Tab>
  )
}

// ─── TabsContent (unchanged) ──────────────────────────────────────────────────

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }