// ============================================
// StatsCard Component
// Reusable stat display card used in dashboards
// Shows icon, label, value, and optional color
// ============================================

const StatsCard = ({ icon, label, value, color = "blue", subtitle }) => {

  const colorMap = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
    green:  { bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100" },
    yellow: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-100" },
    red:    { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-white rounded-xl border ${c.border}
                     p-5 flex items-center gap-4 shadow-sm
                     hover:shadow-md transition-shadow duration-200`}>

      {/* Icon container */}
      <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center
                       justify-center text-2xl flex-shrink-0`}>
        {icon}
      </div>

      {/* Text */}
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatsCard;