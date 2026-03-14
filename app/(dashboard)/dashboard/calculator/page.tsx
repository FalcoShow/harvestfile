export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">ARC/PLC Calculator</h2>
        <p className="text-gray-400 mt-1">
          Run program payment calculations with real USDA county yield data.
        </p>
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-16 text-center">
        <div className="text-4xl mb-4">🧮</div>
        <h3 className="text-lg font-semibold text-white">Calculator coming in Phase B</h3>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">
          The enterprise calculator will run calculations for all crops in a farmer&apos;s portfolio simultaneously and store results in the database.
        </p>
      </div>
    </div>
  );
}
