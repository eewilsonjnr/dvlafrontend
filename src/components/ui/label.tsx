import React from "react";
export function Label({ className = "", children, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-medium text-gray-700 ${className}`} {...p}>{children}</label>;
}
