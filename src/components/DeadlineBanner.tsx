export default function DeadlineBanner() {
  return (
    <div className="bg-red-50 border-y border-red-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center text-sm text-red-800">
          <span>
            &#9888; <span className="font-semibold">March 15</span> deadline: Crop insurance sales closing for corn &amp; soybeans
          </span>
          <span>
            &#9888; <span className="font-semibold">March 9 &ndash; April 17</span>: General CRP Signup #66 is OPEN
          </span>
          <span>
            &#9888; <span className="font-semibold">Feb 23 &ndash; April 17</span>: Farmer Bridge Assistance enrollment closes
          </span>
        </div>
      </div>
    </div>
  );
}
