import React from "react";
export function Card({ className = "", children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...p}>{children}</div>;
}
export function CardHeader({ className = "", children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 pt-5 pb-3 ${className}`} {...p}>{children}</div>;
}
export function CardTitle({ className = "", children, ...p }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-semibold text-gray-900 ${className}`} {...p}>{children}</h3>;
}
export function CardContent({ className = "", children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 pb-5 ${className}`} {...p}>{children}</div>;
}
