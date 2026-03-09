interface ScreenerStepProps {
  title: string;
  helper?: string;
  children: React.ReactNode;
}

export default function ScreenerStep({ title, helper, children }: ScreenerStepProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      {helper && <p className="text-sm text-muted mb-6">{helper}</p>}
      {children}
    </div>
  );
}
