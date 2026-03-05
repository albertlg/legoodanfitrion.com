import { useEffect, useMemo, useState } from "react";

function toInitials(label, fallback = "LG") {
  const parts = String(label || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return fallback;
  }
  return parts
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || "")
    .join("");
}

export function AvatarCircle({
  label = "",
  imageUrl = "",
  fallback = "LG",
  className = "",
  title = "",
  alt = "",
  size = 40
}) {
  const [hasError, setHasError] = useState(false);
  const normalizedImageUrl = String(imageUrl || "").trim();
  const initials = useMemo(() => toInitials(label, fallback), [label, fallback]);
  const showImage = normalizedImageUrl && !hasError;

  useEffect(() => {
    setHasError(false);
  }, [normalizedImageUrl]);

  return (
    <span className={className} aria-hidden="true" title={title || label || initials} style={{ width: size, height: size }}>
      {showImage ? (
        <img
          className="avatar-image"
          src={normalizedImageUrl}
          alt={alt || label || initials}
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
