import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80":
            variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80":
            variant === "destructive",
          "border-transparent bg-accent text-accent-foreground hover:bg-accent/80":
            variant === "accent",
          "border-primary text-primary hover:bg-primary hover:text-primary-foreground":
            variant === "outline",
          "bg-blue-100 text-blue-800 border-blue-200": 
            variant === "blue",
          "bg-green-100 text-green-800 border-green-200": 
            variant === "green",
          "bg-red-100 text-red-800 border-red-200": 
            variant === "red",
          "bg-yellow-100 text-yellow-800 border-yellow-200": 
            variant === "yellow",
          "bg-purple-100 text-purple-800 border-purple-200": 
            variant === "purple",
          "bg-gray-100 text-gray-800 border-gray-200": 
            variant === "gray",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };