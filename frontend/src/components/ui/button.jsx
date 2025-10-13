import React from "react";

export function Button({
  children,
  onClick,
  className = "",
  type = "button",
  size = "md",
}) {
  const baseStyle =
    "rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const sizeStyle =
    size === "sm"
      ? "px-3 py-1 text-sm"
      : size === "lg"
      ? "px-6 py-3 text-lg"
      : "px-4 py-2 text-base";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${sizeStyle} ${className}`}
    >
      {children}
    </button>
  );
}
