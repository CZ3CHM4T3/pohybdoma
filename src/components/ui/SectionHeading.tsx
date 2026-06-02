interface SectionHeadingProps {
  label?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export function SectionHeading({ label, title, subtitle, centered = false }: SectionHeadingProps) {
  return (
    <div className={centered ? "text-center" : ""}>
      {label && (
        <p className="text-xs font-semibold tracking-widest uppercase text-brand-blue mb-2">
          {label}
        </p>
      )}
      <h2 className="text-3xl lg:text-4xl font-semibold text-brand-dark leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-gray-600 leading-relaxed max-w-2xl" style={{ marginLeft: centered ? "auto" : undefined, marginRight: centered ? "auto" : undefined }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
