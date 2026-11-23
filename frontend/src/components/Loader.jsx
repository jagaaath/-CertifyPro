// ============================================
// Loader Component
// Reusable full-page and inline loading spinner
// ============================================

const Loader = ({ fullPage = false, size = "md", text = "Loading..." }) => {
  // Size variants for the spinner
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes[size]} border-primary-600 border-t-transparent
                    rounded-full animate-spin`}
      />
      {text && <p className="text-gray-500 text-sm">{text}</p>}
    </div>
  );

  // Full page centered loader
  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {spinner}
      </div>
    );
  }

  // Inline loader
  return (
    <div className="flex items-center justify-center py-12">
      {spinner}
    </div>
  );
};

export default Loader;