import { useState } from "react";

function BrandMark({ text, fallback }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="brand-mark">
      {imgError ? (
        <div className="brand-fallback" aria-label={text}>
          {fallback}
        </div>
      ) : (
        <img
          className="brand-logo"
          src="/brand/logo-legoodanfitrion.png"
          alt={text}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

export { BrandMark };

