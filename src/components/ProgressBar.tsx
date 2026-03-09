interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-2xl mx-auto mb-8">
      <p className="text-sm text-muted mb-2">
        Step {currentStep} of {totalSteps}
      </p>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
