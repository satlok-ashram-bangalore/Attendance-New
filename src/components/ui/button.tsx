import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed ',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 cursor-pointer',
        secondary:'bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--foreground)] rounded-lg transition-colors border border-[var(--border)]',
        outline:'bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--foreground)] rounded-lg transition-colors border border-[var(--border)]',
        ghost: 'bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactElement<{ className?: string }>;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // When asChild is true and we have an icon, we need to ensure children is a single React element
    // If children is already a single element, use it directly. Otherwise wrap in fragment.
    const content = (
      <>
        {isLoading && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-spin h-4 w-4 mr-2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
        {!isLoading &&
          icon &&
          React.cloneElement(icon, {
            className: cn('h-4 w-4 ', icon.props.className),
          })}
        {isLoading ? loadingText : children}
      </>
    );

    // If not asChild, render normally
    if (!asChild) {
      return (
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={isLoading || props.disabled}
          {...props}
        >
          {content}
        </button>
      );
    }

    // If asChild and children is a single valid React element without icon/loading, pass through
    if (!icon && !isLoading && React.isValidElement(children)) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={props.disabled}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    // If asChild with icon or loading, we can't use Slot (would violate React.Children.only)
    // Fall back to regular button
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };