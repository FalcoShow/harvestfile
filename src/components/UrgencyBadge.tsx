interface UrgencyBadgeProps {
  deadline: {
    date: string;
    description: string;
    urgency: 'normal' | 'soon' | 'urgent';
  };
}

export default function UrgencyBadge({ deadline }: UrgencyBadgeProps) {
  const now = new Date();
  const deadlineDate = new Date(deadline.date);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let colorClasses: string;
  let suffix: string = '';

  if (deadline.urgency === 'urgent') {
    colorClasses = 'bg-red-50 text-alert border border-red-200';
    suffix = daysLeft > 0 ? ` \u00B7 ${daysLeft} days left` : ' \u00B7 PASSED';
  } else if (deadline.urgency === 'soon') {
    colorClasses = 'bg-amber-50 text-amber-700 border border-amber-200';
    suffix = ` \u00B7 ${daysLeft} days left`;
  } else {
    colorClasses = 'bg-gray-50 text-muted border border-gray-200';
  }

  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${colorClasses}`}
    >
      {deadline.description}{suffix}
    </span>
  );
}
