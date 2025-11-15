export function Loading({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <div className="flex items-center justify-center min-h-96">
      <span
        className={`loading loading-spinner loading-${size} text-primary`}
      ></span>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="mt-4 text-base-content">Loading...</p>
    </div>
  );
}
